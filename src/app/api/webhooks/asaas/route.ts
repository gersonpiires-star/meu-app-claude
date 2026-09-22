import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoAsaas } from "@/lib/asaas";
import { aprovarRenovacaoPaga } from "@/lib/pagamentos";

// Asaas não deixa configurar uma URL de webhook por cobrança como o
// Mercado Pago (notification_url na preferência) — o webhook é configurado
// uma vez só no painel de cada revendedor, todos apontando pra essa mesma
// URL. Por isso a correlação com o pagamento certo depende inteiramente do
// externalReference que a gente manda na criação da cobrança (nosso
// pagamentoId), não de um parâmetro na própria URL do webhook.
function statusAsaasParaInterno(status: string): "APROVADO" | "CANCELADO" | "PENDENTE" {
  if (status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH") return "APROVADO";
  if (status.startsWith("REFUND") || status.startsWith("CHARGEBACK")) return "CANCELADO";
  return "PENDENTE";
}

export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const asaasPayment = (corpo as { payment?: { id?: string; externalReference?: string | null } } | null)?.payment;
  const pagamentoId = asaasPayment?.externalReference ?? null;
  const asaasPaymentId = asaasPayment?.id ?? null;
  if (!pagamentoId || !asaasPaymentId) {
    return NextResponse.json({ ok: true, ignorado: "sem identificadores" });
  }

  const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } });
  if (!pagamento) {
    return NextResponse.json({ ok: true, ignorado: "pagamento não encontrado" });
  }

  const revendedor = await prisma.revendedor.findUnique({
    where: { id: pagamento.revendedorId },
    select: { asaasApiKey: true },
  });
  if (!revendedor?.asaasApiKey) {
    console.error(`Webhook Asaas: revendedor ${pagamento.revendedorId} sem token para pagamento ${pagamento.id}`);
    // Mesmo raciocínio do webhook do Mercado Pago: um status de erro faz o
    // Asaas reentregar mais tarde, dando chance de o token já estar
    // corrigido — responder 2xx faria ele parar de tentar de novo.
    return NextResponse.json({ ok: false, ignorado: "sem token" }, { status: 503 });
  }

  // Nunca confiar no status que vem no corpo do webhook: a fonte de verdade
  // é a resposta da própria API do Asaas, buscada com o token do revendedor.
  let pagamentoAsaas;
  try {
    pagamentoAsaas = await buscarPagamentoAsaas(revendedor.asaasApiKey, asaasPaymentId);
  } catch (erro) {
    console.error("Webhook Asaas: falha ao consultar pagamento na API", erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  if (pagamentoAsaas.externalReference !== pagamentoId) {
    console.error(`Webhook Asaas: externalReference não confere para pagamento ${pagamentoId}`);
    return NextResponse.json({ ok: true, ignorado: "referência não confere" });
  }

  const novoStatus = statusAsaasParaInterno(pagamentoAsaas.status);

  if (novoStatus !== "APROVADO") {
    // Mesma trava do webhook do Mercado Pago: nunca sobrescrever um
    // pagamento já APROVADO. Sem isso, uma entrega atrasada/reentregue de um
    // evento antigo (ex: PAYMENT_CREATED chegando depois do PAYMENT_RECEIVED
    // já processado) rebaixava o status pra PENDENTE — daí uma reentrega
    // legítima do evento de aprovação passava de novo pela trava de
    // idempotência do aprovarRenovacaoPaga (que só olha status !== APROVADO)
    // e duplicava a renovação (Renovacao extra + vencimento estendido 2x).
    await prisma.pagamento.updateMany({
      where: { id: pagamento.id, status: { notIn: ["RECUSADO", "CANCELADO", "APROVADO"] } },
      data: { status: novoStatus, asaasPaymentId },
    });
    return NextResponse.json({ ok: true });
  }

  const resultado = await aprovarRenovacaoPaga(pagamentoId, asaasPaymentId, "asaasPaymentId");
  return NextResponse.json({ ok: true, ignorado: resultado.jaProcessado ? "já processado" : undefined });
}

export async function GET(request: Request) {
  return POST(request);
}
