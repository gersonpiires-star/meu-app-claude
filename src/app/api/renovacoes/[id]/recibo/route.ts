import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { brl, dataPorExtenso } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";

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

  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([300, 420]);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);

  let y = 380;
  function linha(
    texto: string,
    opts: { negrito?: boolean; tamanho?: number; cor?: [number, number, number] } = {}
  ) {
    pagina.drawText(texto, {
      x: 30,
      y,
      size: opts.tamanho ?? 11,
      font: opts.negrito ? fonteNegrito : fonte,
      color: opts.cor ? rgb(...opts.cor) : rgb(0.1, 0.1, 0.1),
    });
    y -= (opts.tamanho ?? 11) + 10;
  }

  linha(revendedor.nome, { negrito: true, tamanho: 14 });
  linha("Comprovante de renovação", { tamanho: 10, cor: [0.4, 0.4, 0.4] });
  y -= 8;
  linha(`Cliente: ${renovacao.cliente.nome}`);
  linha(`Serviço: ${renovacao.cliente.servico?.nome ?? "—"}`);
  linha(`Plano: ${PLANO_LABEL[renovacao.plano]}`);
  linha(`Data: ${dataPorExtenso(renovacao.data)}`);
  y -= 8;
  linha(`Valor pago: ${brl(renovacao.valor)}`, { negrito: true, tamanho: 16, cor: [0, 0.5, 0.4] });
  y -= 16;
  linha("Recibo gerado automaticamente pelo GestorPro.", { tamanho: 8, cor: [0.5, 0.5, 0.5] });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${id}.pdf"`,
    },
  });
}
