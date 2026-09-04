import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { brl, dataPorExtenso } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";
import { gerarReciboPdf } from "@/lib/recibo-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const revendedor = await exigirRevendedor();
  const { id } = await params;

  const renovacao = await prisma.renovacao.findUnique({
    where: { id },
    include: { cliente: { include: { servico: true } } },
  });
  if (!renovacao || renovacao.cliente.revendedorId !== revendedor.id) {
    return NextResponse.json({ erro: "Recibo não encontrado." }, { status: 404 });
  }

  const bytes = await gerarReciboPdf({
    emitente: { nome: revendedor.nome, whatsapp: revendedor.whatsapp },
    subtitulo: "Comprovante de renovação",
    campos: [
      { rotulo: "Cliente", valor: renovacao.cliente.nome },
      { rotulo: "Serviço", valor: renovacao.cliente.servico?.nome ?? "—" },
      { rotulo: "Plano renovado", valor: PLANO_LABEL[renovacao.plano] },
      { rotulo: "Pago em", valor: dataPorExtenso(renovacao.data) },
      { rotulo: "Novo vencimento", valor: dataPorExtenso(renovacao.cliente.vencimento) },
    ],
    destaqueRotulo: "Valor pago",
    destaqueValor: brl(renovacao.valor),
    reciboId: id,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${renovacao.cliente.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
