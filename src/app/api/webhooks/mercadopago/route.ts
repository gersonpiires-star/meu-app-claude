import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoMP, tokenPlataforma } from "@/lib/mercadopago";
import { aprovarRenovacaoPaga, aprovarAssinaturaPaga } from "@/lib/pagamentos";
import { enviarPush } from "@/lib/push";

function extrairPaymentId(url: URL, corpo: unknown): string | null {
  const porQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (porQuery) return porQuery;

  if (corpo && typeof corpo === "object") {
    const dados = corpo as { data?: { id?: string | number }; type?: string; topic?: string };
    if (dados.data?.id) return String(dados.data.id);
  }
  return null;
}

function ehNotificacaoDePagamento(url: URL, corpo: unknown): boolean {
  const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
  if (topic) return topic === "payment";
  if (corpo && typeof corpo === "object") {
    const dados = corpo as { type?: string };
    if (dados.type) return dados.type === "payment";
  }
  return true;
}

function statusMPParaInterno(status: string): "APROVADO" | "RECUSADO" | "CANCELADO" | "PENDENTE" {
  if (status === "approved") return "APROVADO";
  if (status === "rejected") return "RECUSADO";
  if (status === "cancelled" || status === "refunded" || status === "charged_back") return "CANCELADO";
  return "PENDENTE";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => null);

  if (!ehNotificacaoDePagamento(url, corpo)) {
    return NextResponse.json({ ok: true });
  }

  const pagamentoId = url.searchParams.get("pagamentoId");
  const mpPaymentId = extrairPaymentId(url, corpo);
  if (!pagamentoId || !mpPaymentId) {
    return NextResponse.json({ ok: true, ignorado: "sem identificadores" });
  }

  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: { revendedor: { include: { pushSubscriptions: true } }, cliente: true },
  });
  if (!pagamento) {
    return NextResponse.json({ ok: true, ignorado: "pagamento não encontrado" });
  }

  const accessToken = pagamento.tipo === "ASSINATURA" ? tokenPlataforma() : pagamento.revendedor.mpAccessToken;
  if (!accessToken) {
    console.error(`Webhook MP: revendedor ${pagamento.revendedorId} sem token para pagamento ${pagamento.id}`);
    // Responder 2xx aqui diria ao Mercado Pago "processado com sucesso" e ele
    // pararia de reenviar essa notificação — se o revendedor só reconectar o
    // token depois, o pagamento ficaria PENDENTE pra sempre sem nenhum outro
    // gatilho pra reconferir. Um status de erro faz o MP tentar de novo mais
    // tarde, dando chance de o token já estar corrigido na próxima entrega.
    return NextResponse.json({ ok: false, ignorado: "sem token" }, { status: 503 });
  }

  let pagamentoMP;
  try {
    pagamentoMP = await buscarPagamentoMP(accessToken, mpPaymentId);
  } catch (erro) {
    console.error("Webhook MP: falha ao consultar pagamento na API", erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Nunca confiar no corpo do webhook: a fonte de verdade é a resposta da
  // API do Mercado Pago, buscada com o token correto. Conferimos ainda que
  // a referência bate com o pagamento que esperávamos.
  if (pagamentoMP.external_reference !== pagamentoId) {
    console.error(`Webhook MP: external_reference não confere para pagamento ${pagamentoId}`);
    return NextResponse.json({ ok: true, ignorado: "referência não confere" });
  }

  const novoStatus = statusMPParaInterno(pagamentoMP.status ?? "pending");

  if (novoStatus !== "APROVADO") {
    await prisma.$transaction(async (tx) => {
      const trocou = await tx.pagamento.updateMany({
        where: { id: pagamento.id, status: { notIn: ["RECUSADO", "CANCELADO", "APROVADO"] } },
        data: { status: novoStatus, mpPaymentId: String(pagamentoMP.id) },
      });

      // Libera o uso do cupom (reservado no checkout, em iniciarPagamentoAssinatura)
      // só na primeira vez que esse pagamento chega a um status final de
      // falha — sem essa trava, o Mercado Pago reentregando a mesma
      // notificação devolveria o uso do cupom mais de uma vez, inflando o
      // saldo de usos disponíveis pra além do limite real.
      if (trocou.count > 0 && pagamento.cupomId && (novoStatus === "RECUSADO" || novoStatus === "CANCELADO")) {
        await tx.$executeRaw`
          UPDATE "Cupom" SET "usosCount" = GREATEST("usosCount" - 1, 0) WHERE id = ${pagamento.cupomId}
        `;
      }

      // Mesma lógica do cupom: o crédito reservado no checkout (ver
      // iniciarPagamentoAssinatura) volta pro saldo do revendedor se o
      // pagamento não vingou — senão o desconto de crédito seria perdido
      // toda vez que um pagamento é recusado/cancelado.
      if (trocou.count > 0 && pagamento.creditoAplicado > 0 && (novoStatus === "RECUSADO" || novoStatus === "CANCELADO")) {
        await tx.revendedor.update({
          where: { id: pagamento.revendedorId },
          data: { saldoCreditos: { increment: pagamento.creditoAplicado } },
        });
      }
    });

    // Pagamento de assinatura recusado: avisa o próprio revendedor (não só
    // o admin, que já recebe isso no resumo diário) com um link direto pra
    // tentar de novo — sem isso ele só descobria quando o acesso pausasse.
    if (novoStatus === "RECUSADO" && pagamento.tipo === "ASSINATURA") {
      for (const inscricao of pagamento.revendedor.pushSubscriptions) {
        const manter = await enviarPush(inscricao, {
          titulo: "Pagamento não aprovado",
          corpo: "Seu pagamento da assinatura do GestorPro não foi aprovado. Toque para tentar de novo.",
          url: "/assinatura",
        });
        if (!manter) {
          await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Renovação de cliente: aprovar o pagamento e aplicar o efeito (estender
  // vencimento, registrar a renovação, avisar o revendedor) é idêntico pro
  // Asaas — mora num helper compartilhado em vez de duplicado aqui.
  if (pagamento.tipo === "RENOVACAO") {
    const resultado = await aprovarRenovacaoPaga(pagamentoId, String(pagamentoMP.id), "mpPaymentId");
    return NextResponse.json({ ok: true, ignorado: resultado.jaProcessado ? "já processado" : undefined });
  }

  // Só resta ASSINATURA daqui pra baixo — pagamento da própria mensalidade
  // do GestorPro. O efeito (ativar conta, indicação) mora num helper
  // compartilhado com o caminho de checkout 100% coberto por crédito (ver
  // iniciarPagamentoAssinatura) — os dois precisam do mesmo resultado.
  //
  // Receita que de fato entra pra Administração GestorPro — o Mercado Pago
  // desconta a taxa dele antes de repassar. net_received_amount é o valor
  // líquido que a própria API do MP devolve pra esse pagamento; sem ele (ou
  // transaction_amount), cai pro preço cheio cobrado do revendedor em vez
  // de quebrar a aprovação por causa disso.
  const valorLiquido =
    pagamentoMP.transaction_details?.net_received_amount ?? pagamentoMP.transaction_amount ?? pagamento.valor;
  const resultado = await aprovarAssinaturaPaga(pagamentoId, String(pagamentoMP.id), valorLiquido);

  return NextResponse.json({ ok: true, ignorado: resultado.jaProcessado ? "já processado" : undefined });
}

export async function GET(request: Request) {
  return POST(request);
}
