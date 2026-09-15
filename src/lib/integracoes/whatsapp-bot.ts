import { prisma } from "@/lib/prisma";
import { brl, dataPorExtenso } from "@/lib/format";
import { faixaVencimento } from "@/lib/planos";
import { linkPagamentoCliente } from "@/lib/pagamentos";

// A Cloud API sempre manda o número de quem escreveu com código de país (ex:
// "5511999999999"), mas o Cliente.whatsapp no banco às vezes está sem —
// mesma inconsistência que lib/mensagens.ts já trata pro lado de saída (link
// wa.me). Aqui normalizamos os dois lados pro formato só-DDD+número, que é
// o que sobra em qualquer um dos formatos de entrada.
function numeroLocalBr(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 11 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}

const MENU = `Escolha uma opção:

1️⃣ Ver vencimento, valor e link para renovar
2️⃣ Chave Pix para pagar direto
3️⃣ Falar com atendente

Responda só com o número.`;

// Resposta automática a UMA mensagem recebida. Sem estado de conversa entre
// mensagens (cada mensagem é tratada isolada) — pra V1 é suficiente: quem
// não mandar "1", "2" ou "3" recebe o menu de novo.
export async function responderMensagemWhatsapp(
  revendedorId: string,
  deNumero: string,
  textoRecebido: string
): Promise<string> {
  const clientes = await prisma.cliente.findMany({
    where: { revendedorId, whatsapp: { not: null } },
    select: { id: true, nome: true, whatsapp: true, status: true, vencimento: true, valorPlano: true, servico: { select: { nome: true } } },
  });
  const alvo = numeroLocalBr(deNumero);
  const cliente = clientes.find((c) => c.whatsapp && numeroLocalBr(c.whatsapp) === alvo);

  if (!cliente) {
    return "Olá! Não encontrei um cadastro com este número por aqui. Confirme se está entrando em contato pelo mesmo WhatsApp informado no seu cadastro, ou fale direto com quem te atende.";
  }

  const primeiroNome = cliente.nome.trim().split(" ")[0] || cliente.nome;
  const opcao = textoRecebido.trim();

  if (opcao === "1") {
    if (cliente.status === "CANCELADO") return "Seu plano está cancelado no momento. Fale com quem te atende para reativar.";
    const faixa = faixaVencimento(cliente.vencimento);
    const status = faixa === "VENCIDO" ? "vencido" : "em dia";
    return `${cliente.servico?.nome ?? "Seu plano"} — ${status}\nVencimento: ${dataPorExtenso(cliente.vencimento)}\nValor: ${brl(cliente.valorPlano)}\n\nPara renovar: ${linkPagamentoCliente(cliente.id)}`;
  }

  if (opcao === "2") {
    const chaves = await prisma.chavePix.findMany({ where: { revendedorId }, orderBy: { criadoEm: "desc" } });
    if (chaves.length === 0) return "Ainda não há uma chave Pix cadastrada aqui — fale direto com quem te atende.";
    return chaves.map((c) => `${c.tipo}: ${c.valor}`).join("\n");
  }

  if (opcao === "3") {
    return "Encaminhei sua mensagem — a pessoa que te atende vai te responder por aqui em breve.";
  }

  return `Olá, ${primeiroNome}! 👋\n\n${MENU}`;
}
