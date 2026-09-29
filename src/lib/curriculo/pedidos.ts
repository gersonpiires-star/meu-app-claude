import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoMP, criarPreferencia, tokenPlataforma } from "@/lib/mercadopago";
import { precoCurriculo, type Curriculo } from "./schema";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function iniciarPedidoCurriculo(dados: Curriculo): Promise<{ url: string } | { erro: string }> {
  let accessToken: string;
  try {
    accessToken = tokenPlataforma();
  } catch {
    return { erro: "Pagamento indisponível no momento. Tente novamente mais tarde." };
  }

  const valor = precoCurriculo();
  const pedido = await prisma.pedidoCurriculo.create({
    data: { token: randomBytes(24).toString("base64url"), dados, valor },
  });

  try {
    const preferencia = await criarPreferencia({
      accessToken,
      pagamentoId: pedido.id,
      titulo: "Download do currículo em PDF",
      valor,
      urlRetorno: `${baseUrl()}/curriculo/pedido/${pedido.token}`,
      caminhoWebhook: "/api/webhooks/mercadopago-curriculo",
    });
    if (!preferencia.init_point || !preferencia.id) throw new Error("Preferência sem init_point");

    await prisma.pedidoCurriculo.update({ where: { id: pedido.id }, data: { mpPreferenceId: preferencia.id } });
    return { url: preferencia.init_point };
  } catch (erro) {
    console.error("Currículo: falha ao criar preferência no Mercado Pago", erro);
    await prisma.pedidoCurriculo.delete({ where: { id: pedido.id } }).catch(() => {});
    return { erro: "Não foi possível iniciar o pagamento. Tente novamente." };
  }
}

// Fonte de verdade é sempre a API do Mercado Pago (nunca o corpo do webhook
// nem a query da URL de retorno, que o comprador consegue forjar): busca o
// pagamento com o token da plataforma, confere que ele pertence a este
// pedido e que o valor pago cobre o preço do pedido antes de liberar o PDF.
export async function confirmarPagamentoCurriculo(pedidoId: string, mpPaymentId: string): Promise<void> {
  const pedido = await prisma.pedidoCurriculo.findUnique({ where: { id: pedidoId } });
  if (!pedido || pedido.status === "APROVADO") return;

  const pagamentoMP = await buscarPagamentoMP(tokenPlataforma(), mpPaymentId);
  if (pagamentoMP.external_reference !== pedido.id) return;

  const status = pagamentoMP.status;
  if (status === "approved") {
    if ((pagamentoMP.transaction_amount ?? 0) < pedido.valor) return;
    await prisma.pedidoCurriculo.updateMany({
      where: { id: pedido.id, status: { not: "APROVADO" } },
      data: { status: "APROVADO", mpPaymentId: String(pagamentoMP.id), pagoEm: new Date() },
    });
    return;
  }

  if (status === "rejected" || status === "cancelled") {
    await prisma.pedidoCurriculo.updateMany({
      where: { id: pedido.id, status: "PENDENTE" },
      data: { status: status === "rejected" ? "RECUSADO" : "CANCELADO" },
    });
  }
}
