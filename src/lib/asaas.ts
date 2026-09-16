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

  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 1);

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
