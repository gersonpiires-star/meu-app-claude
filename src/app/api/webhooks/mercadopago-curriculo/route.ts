import { NextResponse } from "next/server";
import { confirmarPagamentoCurriculo } from "@/lib/curriculo/pedidos";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => null);

  const topic = url.searchParams.get("topic") ?? url.searchParams.get("type") ?? corpo?.type;
  if (topic && topic !== "payment") return NextResponse.json({ ok: true });

  const pedidoId = url.searchParams.get("pagamentoId");
  const mpPaymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? corpo?.data?.id;
  if (!pedidoId || !mpPaymentId) return NextResponse.json({ ok: true, ignorado: "sem identificadores" });

  try {
    await confirmarPagamentoCurriculo(pedidoId, String(mpPaymentId));
  } catch (erro) {
    console.error("Webhook MP (currículo): falha ao confirmar pagamento", erro);
    // Status de erro faz o Mercado Pago reenviar a notificação mais tarde.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  return POST(request);
}
