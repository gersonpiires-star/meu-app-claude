import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarCurriculoPdf } from "@/lib/curriculo/pdf";
import { curriculoSchema } from "@/lib/curriculo/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/curriculo/[token]/pdf">) {
  const { token } = await ctx.params;
  const pedido = await prisma.pedidoCurriculo.findUnique({ where: { token } });
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado" }, { status: 404 });
  if (pedido.status !== "APROVADO") {
    return NextResponse.json({ erro: "Pagamento ainda não confirmado" }, { status: 402 });
  }

  const dados = curriculoSchema.parse(pedido.dados);
  const bytes = await gerarCurriculoPdf(dados);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="curriculo.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
