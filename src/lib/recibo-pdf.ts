import { PDFDocument, StandardFonts, rgb, LineCapStyle, type PDFPage, type PDFFont } from "pdf-lib";
import { dataHora, fmtTelefone } from "@/lib/format";

const NAVY = rgb(0.039, 0.145, 0.188);
const TEAL = rgb(0.18, 0.902, 0.773);
const TEAL_DEEP = rgb(0.114, 0.416, 0.439);
const GRAY_LABEL = rgb(0.55, 0.58, 0.6);
const GRAY_LINE = rgb(0.88, 0.89, 0.9);
const WHITE = rgb(1, 1, 1);

// A marca "Ciclo" do app: um arco de 300° (fica aberto entre 1h e 3h no
// mostrador do relógio) com um ponto onde ele termina, em (cx+raio, cy) —
// a mesma geometria do LogoMark em SVG (circle r=32 strokeWidth=13, ponto
// r=8 em cx=82), só que desenhada como um arco de verdade via drawSvgPath
// (drawCircle do pdf-lib não desenha arco parcial, só círculo inteiro).
function desenharMarca(pagina: PDFPage, cx: number, cy: number, raio: number) {
  const espessura = raio * (13 / 32);
  const fimX = raio * 0.5;
  const fimY = raio * -0.8660254;
  pagina.drawSvgPath(`M ${raio} 0 A ${raio} ${raio} 0 1 1 ${fimX} ${fimY}`, {
    x: cx,
    y: cy,
    borderColor: TEAL,
    borderWidth: espessura,
    borderLineCap: LineCapStyle.Round,
  });
  pagina.drawCircle({ x: cx + raio, y: cy, size: raio * 0.25, color: TEAL_DEEP });
}

// Nome de cliente/produto vem de texto livre, sem limite de tamanho — sem
// isso um nome comprido vaza pra fora da margem (pdf-lib não faz wrap nem
// clipping automático). Corta com reticências no que couber na largura.
function truncarTexto(font: PDFFont, texto: string, tamanho: number, larguraMax: number): string {
  if (font.widthOfTextAtSize(texto, tamanho) <= larguraMax) return texto;
  let corte = texto;
  while (corte.length > 1 && font.widthOfTextAtSize(`${corte}…`, tamanho) > larguraMax) {
    corte = corte.slice(0, -1);
  }
  return `${corte}…`;
}

// Layout compartilhado pelos recibos de renovação e de venda de aparelho —
// mesma identidade visual (o negócio do revendedor em destaque, a marca do
// GestorPro como crédito discreto no rodapé), só muda o conteúdo dos campos.
export async function gerarReciboPdf({
  emitente,
  subtitulo,
  campos,
  destaqueRotulo,
  destaqueValor,
  reciboId,
}: {
  emitente: { nome: string; whatsapp: string | null };
  subtitulo: string;
  campos: { rotulo: string; valor: string }[];
  destaqueRotulo: string;
  destaqueValor: string;
  reciboId: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const width = 340;
  const height = 520;
  const margin = 28;
  const pagina = pdf.addPage([width, height]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  let y = height - 44;
  const larguraUtil = width - margin * 2;

  // Cabeçalho leva a marca do GestorPro (o app que emite o recibo) — o nome
  // do revendedor vira uma linha de "emitido por" logo abaixo, não o
  // destaque principal.
  const logoR = 10;
  const logoCx = margin + logoR;
  const logoCy = y - logoR + 6;
  desenharMarca(pagina, logoCx, logoCy, logoR);
  pagina.drawText("GestorPro", { x: margin + logoR * 2 + 10, y: y - 6, size: 17, font: bold, color: NAVY });
  y -= 26;
  pagina.drawText(subtitulo, { x: margin, y, size: 9.5, font: regular, color: GRAY_LABEL });
  y -= 14;
  pagina.drawText(truncarTexto(regular, `Emitido por ${emitente.nome}`, 9, larguraUtil), { x: margin, y, size: 9, font: regular, color: GRAY_LABEL });
  y -= 14;
  pagina.drawRectangle({ x: margin, y, width: larguraUtil, height: 2.5, color: TEAL });
  y -= 30;

  for (const { rotulo, valor } of campos) {
    pagina.drawText(rotulo.toUpperCase(), { x: margin, y, size: 8, font: bold, color: GRAY_LABEL });
    y -= 14;
    pagina.drawText(truncarTexto(regular, valor, 12, larguraUtil), { x: margin, y, size: 12, font: regular, color: NAVY });
    y -= 24;
  }

  y -= 6;

  const boxAltura = 56;
  const larguraDestaque = larguraUtil - 32;
  pagina.drawRectangle({ x: margin, y: y - boxAltura, width: larguraUtil, height: boxAltura, color: NAVY });
  pagina.drawText(destaqueRotulo.toUpperCase(), { x: margin + 16, y: y - 20, size: 8.5, font: bold, color: TEAL });
  pagina.drawText(truncarTexto(bold, destaqueValor, 20, larguraDestaque), { x: margin + 16, y: y - 42, size: 20, font: bold, color: WHITE });
  y -= boxAltura + 28;

  if (emitente.whatsapp) {
    pagina.drawText(`Dúvidas? Fale no WhatsApp: ${fmtTelefone(emitente.whatsapp)}`, {
      x: margin,
      y,
      size: 9,
      font: regular,
      color: GRAY_LABEL,
    });
  }

  const rodapeY = 40;
  pagina.drawRectangle({ x: margin, y: rodapeY + 20, width: width - margin * 2, height: 1, color: GRAY_LINE });

  const cx = margin + 7;
  const cy = rodapeY - 2;
  desenharMarca(pagina, cx, cy, 6);
  pagina.drawText("GestorPro", { x: cx + 16, y: rodapeY - 6, size: 9, font: bold, color: NAVY });

  pagina.drawText(`Recibo #${reciboId.slice(0, 8).toUpperCase()} · gerado em ${dataHora(new Date())}`, {
    x: margin,
    y: rodapeY - 22,
    size: 7,
    font: regular,
    color: GRAY_LABEL,
  });

  return pdf.save();
}
