import { diaCivilBr } from "@/lib/format";

const ASAAS_API_BASE = process.env.ASAAS_API_BASE ?? "https://api.asaas.com/v3";

type ErroAsaas = { errors?: { description?: string }[] };

async function chamarAsaas<T>(apiKey: string, caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${ASAAS_API_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...opcoes.headers,
    },
  });
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = (corpo as ErroAsaas | null)?.errors?.[0]?.description ?? `Asaas respondeu ${resposta.status}`;
    throw new Error(mensagem);
  }
  return corpo as T;
}

async function buscarOuCriarClienteAsaas(apiKey: string, nome: string, cpfCnpj: string): Promise<string> {
  const cpfCnpjLimpo = cpfCnpj.replace(/\D/g, "");
  // Busca por cpfCnpj primeiro pra não criar um cliente novo no Asaas a
  // cada cobrança gerada pro mesmo cliente do revendedor.
  const busca = await chamarAsaas<{ data: { id: string }[] }>(
    apiKey,
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpjLimpo)}`
  );
  if (busca.data[0]?.id) return busca.data[0].id;

  const criado = await chamarAsaas<{ id: string }>(apiKey, "/customers", {
    method: "POST",
    body: JSON.stringify({ name: nome, cpfCnpj: cpfCnpjLimpo }),
  });
  return criado.id;
}

export async function criarCobrancaAsaas({
  apiKey,
  pagamentoId,
  clienteNome,
  cpfCnpj,
  valor,
}: {
  apiKey: string;
  pagamentoId: string;
  clienteNome: string;
  cpfCnpj: string;
  valor: number;
}): Promise<{ url: string; asaasPaymentId: string }> {
  const clienteAsaasId = await buscarOuCriarClienteAsaas(apiKey, clienteNome, cpfCnpj);

  // Prazo de alguns dias, não "amanhã" — o pagador escolhe o método (Pix,
  // boleto ou cartão) só depois de abrir o link, e um boleto emitido com
  // vencimento pra amanhã costuma já aparecer vencido pros bancos/lotéricas
  // se ele não pagar no mesmo dia que recebeu o link.
  // Soma os 3 dias em cima do dia civil de Brasília (não `new Date().setDate`
  // cru): o servidor roda em UTC, e entre 21h e 23h59 em Brasília o dia civil
  // UTC já virou o dia seguinte, o que jogava o vencimento do boleto um dia
  // pra frente do esperado nesse intervalo.
  const hoje = diaCivilBr(new Date());
  const vencimento = new Date(Date.UTC(hoje.ano, hoje.mes, hoje.dia + 3));

  const cobranca = await chamarAsaas<{ id: string; invoiceUrl: string }>(apiKey, "/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: clienteAsaasId,
      // Deixa o pagador escolher Pix, boleto ou cartão na própria página do Asaas.
      billingType: "UNDEFINED",
      value: valor,
      dueDate: vencimento.toISOString().slice(0, 10),
      externalReference: pagamentoId,
      description: `Renovação — ${clienteNome}`,
    }),
  });

  return { url: cobranca.invoiceUrl, asaasPaymentId: cobranca.id };
}

export async function buscarPagamentoAsaas(apiKey: string, asaasPaymentId: string) {
  return chamarAsaas<{ id: string; status: string; externalReference: string | null }>(
    apiKey,
    `/payments/${asaasPaymentId}`
  );
}
