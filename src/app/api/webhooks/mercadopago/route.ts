import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoMP, tokenPlataforma } from "@/lib/mercadopago";
import { calcularVencimento } from "@/lib/planos";
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
    include: { revendedor: true, cliente: true },
  });
  if (!pagamento) {
    return NextResponse.json({ ok: true, ignorado: "pagamento não encontrado" });
  }

  const accessToken = pagamento.tipo === "ASSINATURA" ? tokenPlataforma() : pagamento.revendedor.mpAccessToken;
  if (!accessToken) {
    console.error(`Webhook MP: revendedor ${pagamento.revendedorId} sem token para pagamento ${pagamento.id}`);
    return NextResponse.json({ ok: true, ignorado: "sem token" });
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
  const jaEstavaAprovado = pagamento.status === "APROVADO";

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { status: novoStatus, mpPaymentId: String(pagamentoMP.id) },
  });

  if (novoStatus === "APROVADO" && !jaEstavaAprovado) {
    if (pagamento.tipo === "ASSINATURA") {
      const meses = pagamento.meses ?? 1;
      const base =
        pagamento.revendedor.assinaturaVence && pagamento.revendedor.assinaturaVence > new Date()
          ? pagamento.revendedor.assinaturaVence
          : new Date();
      const vence = new Date(base);
      vence.setMonth(vence.getMonth() + meses);

      await prisma.revendedor.update({
        where: { id: pagamento.revendedorId },
        data: { statusAssinatura: "ATIVO", assinaturaVence: vence },
      });
    } else if (pagamento.tipo === "RENOVACAO" && pagamento.clienteId && pagamento.plano) {
      const cliente = await prisma.cliente.findUnique({ where: { id: pagamento.clienteId } });
      if (cliente) {
        const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
        const novoVencimento = calcularVencimento(pagamento.plano as PlanoCliente, base);

        await prisma.$transaction([
          prisma.renovacao.create({
            data: {
              clienteId: cliente.id,
              plano: pagamento.plano as PlanoCliente,
              valor: pagamento.valor,
              custo: pagamento.custo,
            },
          }),
          prisma.cliente.update({
            where: { id: cliente.id },
            data: {
              plano: pagamento.plano as PlanoCliente,
              valorPlano: pagamento.valor,
              vencimento: novoVencimento,
              status: "ATIVO",
              testeGratis: false,
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  return POST(request);
}
