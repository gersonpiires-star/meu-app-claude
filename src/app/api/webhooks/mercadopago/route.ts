import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoMP, tokenPlataforma } from "@/lib/mercadopago";
import { calcularVencimento } from "@/lib/planos";
import { enviarPush } from "@/lib/push";
import type { PlanoCliente } from "@/generated/prisma/enums";

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
    await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: { status: novoStatus, mpPaymentId: String(pagamentoMP.id) },
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

  // O Mercado Pago reenvia notificações do mesmo pagamento (rotina pro Pix),
  // então duas entregas podem chegar em paralelo. A troca de status só
  // acontece se AINDA não estava "APROVADO" — updateMany com esse filtro é
  // atômica no Postgres (a segunda entrega concorrente fica bloqueada pelo
  // lock de linha da primeira até ela comitar, e então reavalia o filtro e
  // não encontra mais a linha pra atualizar) — e o side-effect (estender
  // assinatura, ou criar a renovação e atualizar o vencimento do cliente)
  // roda dentro da mesma transação, então nunca fica pela metade nem roda
  // duas vezes pro mesmo pagamento.
  const resultado = await prisma.$transaction(async (tx) => {
    const trocou = await tx.pagamento.updateMany({
      where: { id: pagamento.id, status: { not: "APROVADO" } },
      data: { status: novoStatus, mpPaymentId: String(pagamentoMP.id) },
    });
    if (trocou.count === 0) return { jaProcessado: true };

    if (pagamento.tipo === "ASSINATURA") {
      const revendedorAtual = await tx.revendedor.findUniqueOrThrow({ where: { id: pagamento.revendedorId } });
      const meses = pagamento.meses ?? 1;
      const base =
        revendedorAtual.assinaturaVence && revendedorAtual.assinaturaVence > new Date()
          ? revendedorAtual.assinaturaVence
          : new Date();
      const vence = new Date(base);
      vence.setMonth(vence.getMonth() + meses);

      await tx.revendedor.update({
        where: { id: pagamento.revendedorId },
        data: { statusAssinatura: "ATIVO", assinaturaVence: vence },
      });

      // Só conta o uso do cupom quando o pagamento realmente aprova — um
      // checkout abandonado não deveria consumir o limite de usos.
      if (pagamento.cupomId) {
        await tx.cupom.update({ where: { id: pagamento.cupomId }, data: { usosCount: { increment: 1 } } });
      }
    } else if (pagamento.tipo === "RENOVACAO" && pagamento.clienteId && pagamento.plano) {
      const cliente = await tx.cliente.findUnique({ where: { id: pagamento.clienteId } });
      if (cliente) {
        const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
        const novoVencimento = calcularVencimento(pagamento.plano as PlanoCliente, base);

        await tx.renovacao.create({
          data: {
            clienteId: cliente.id,
            plano: pagamento.plano as PlanoCliente,
            valor: pagamento.valor,
            custo: pagamento.custo,
          },
        });
        await tx.cliente.update({
          where: { id: cliente.id },
          data: {
            plano: pagamento.plano as PlanoCliente,
            valorPlano: pagamento.valor,
            vencimento: novoVencimento,
            status: "ATIVO",
            testeGratis: false,
          },
        });
      }
    }
    return { jaProcessado: false };
  });

  return NextResponse.json({ ok: true, ignorado: resultado.jaProcessado ? "já processado" : undefined });
}

export async function GET(request: Request) {
  return POST(request);
}
