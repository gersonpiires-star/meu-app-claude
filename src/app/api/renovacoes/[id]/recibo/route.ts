import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { brl, dataPorExtenso, dataHora, fmtTelefone } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";

const NAVY = rgb(0.039, 0.145, 0.188);
const TEAL = rgb(0.18, 0.902, 0.773);
const TEAL_DEEP = rgb(0.114, 0.416, 0.439);
const GRAY_LABEL = rgb(0.55, 0.58, 0.6);
const GRAY_LINE = rgb(0.88, 0.89, 0.9);
const WHITE = rgb(1, 1, 1);

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
  const width = 340;
  const height = 520;
  const margin = 28;
  const pagina = pdf.addPage([width, height]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  let y = height - 44;

  // Cabeçalho: o negócio do revendedor é quem "emite" o recibo pro cliente
  // dele — a marca do GestorPro fica como crédito discreto no rodapé, não
  // como identidade principal do documento.
  pagina.drawText(revendedor.nome, { x: margin, y, size: 17, font: bold, color: NAVY });
  y -= 20;
  pagina.drawText("Comprovante de renovação", { x: margin, y, size: 9.5, font: regular, color: GRAY_LABEL });
  y -= 14;
  pagina.drawRectangle({ x: margin, y, width: width - margin * 2, height: 2.5, color: TEAL });
  y -= 30;

  function campo(rotulo: string, valor: string) {
    pagina.drawText(rotulo.toUpperCase(), { x: margin, y, size: 8, font: bold, color: GRAY_LABEL });
    y -= 14;
    pagina.drawText(valor, { x: margin, y, size: 12, font: regular, color: NAVY });
    y -= 24;
  }

  campo("Cliente", renovacao.cliente.nome);
  campo("Serviço", renovacao.cliente.servico?.nome ?? "—");
  campo("Plano renovado", PLANO_LABEL[renovacao.plano]);
  campo("Pago em", dataPorExtenso(renovacao.data));
  campo("Novo vencimento", dataPorExtenso(renovacao.cliente.vencimento));

  y -= 6;

  // Destaque do valor — a única cor sólida forte do documento, pra chamar
  // o olho direto pro que importa num comprovante.
  const boxAltura = 56;
  pagina.drawRectangle({ x: margin, y: y - boxAltura, width: width - margin * 2, height: boxAltura, color: NAVY });
  pagina.drawText("VALOR PAGO", { x: margin + 16, y: y - 20, size: 8.5, font: bold, color: TEAL });
  pagina.drawText(brl(renovacao.valor), { x: margin + 16, y: y - 42, size: 20, font: bold, color: WHITE });
  y -= boxAltura + 28;

  if (revendedor.whatsapp) {
    pagina.drawText(`Dúvidas? Fale no WhatsApp: ${fmtTelefone(revendedor.whatsapp)}`, {
      x: margin,
      y,
      size: 9,
      font: regular,
      color: GRAY_LABEL,
    });
  }

  // Rodapé: marca do app (o mesmo traço do ícone — arco + ponto) e a
  // identificação do recibo, no tamanho de uma nota de rodapé.
  const rodapeY = 40;
  pagina.drawRectangle({ x: margin, y: rodapeY + 20, width: width - margin * 2, height: 1, color: GRAY_LINE });

  const cx = margin + 7;
  const cy = rodapeY - 2;
  pagina.drawCircle({ x: cx, y: cy, size: 6, borderColor: TEAL, borderWidth: 1.6 });
  pagina.drawCircle({ x: cx + 6, y: cy, size: 1.6, color: TEAL_DEEP });
  pagina.drawText("GestorPro", { x: cx + 16, y: rodapeY - 6, size: 9, font: bold, color: NAVY });

  pagina.drawText(`Recibo #${id.slice(0, 8).toUpperCase()} · gerado em ${dataHora(new Date())}`, {
    x: margin,
    y: rodapeY - 22,
    size: 7,
    font: regular,
    color: GRAY_LABEL,
  });

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${renovacao.cliente.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
