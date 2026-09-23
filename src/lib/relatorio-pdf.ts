import { PDFDocument, StandardFonts, rgb, LineCapStyle, type PDFPage, type PDFFont } from "pdf-lib";
import { dataHora, brl0 } from "@/lib/format";

const NAVY = rgb(0.039, 0.145, 0.188);
const TEAL = rgb(0.18, 0.902, 0.773);
const TEAL_DEEP = rgb(0.114, 0.416, 0.439);
const GRAY_LABEL = rgb(0.45, 0.48, 0.5);
const GRAY_LINE = rgb(0.88, 0.89, 0.9);

// Mesma marca "Ciclo" usada no recibo (ver recibo-pdf.ts) — repetida aqui
// porque cada gerador de PDF é standalone (sem dependência cruzada entre eles).
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

function truncarTexto(font: PDFFont, texto: string, tamanho: number, larguraMax: number): string {
  if (font.widthOfTextAtSize(texto, tamanho) <= larguraMax) return texto;
  let corte = texto;
  while (corte.length > 1 && font.widthOfTextAtSize(`${corte}…`, tamanho) > larguraMax) {
    corte = corte.slice(0, -1);
  }
  return `${corte}…`;
}

export async function gerarRelatorioPdf({
  emitente,
  periodoLabel,
  stats,
  maisVendidos,
}: {
  emitente: { nome: string };
  periodoLabel: string;
  stats: {
    receita: number;
    lucro: number;
    margem: number;
    clientesNovos: number;
    naoRenovaram: number;
    taxaPerdaPct: number;
    retencaoPct: number;
    emDia: number;
    vencendo: number;
    vencidos: number;
  };
  maisVendidos: { nome: string; vendas: number; receita: number; lucro: number }[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const width = 595;
  const height = 842;
  const margin = 48;
  const larguraUtil = width - margin * 2;
  const pagina = pdf.addPage([width, height]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  let y = height - 56;

  const logoR = 12;
  desenharMarca(pagina, margin + logoR, y - logoR + 6, logoR);
  pagina.drawText("GestorPro", { x: margin + logoR * 2 + 12, y: y - 6, size: 19, font: bold, color: NAVY });
  y -= 30;
  pagina.drawText(`Relatório · ${periodoLabel}`, { x: margin, y, size: 12, font: bold, color: NAVY });
  y -= 16;
  pagina.drawText(truncarTexto(regular, `${emitente.nome} · gerado em ${dataHora(new Date())}`, 9.5, larguraUtil), {
    x: margin,
    y,
    size: 9.5,
    font: regular,
    color: GRAY_LABEL,
  });
  y -= 16;
  pagina.drawRectangle({ x: margin, y, width: larguraUtil, height: 2, color: TEAL });
  y -= 34;

  const tiles: { rotulo: string; valor: string; sub: string }[] = [
    { rotulo: "Receita", valor: brl0(stats.receita), sub: `margem de ${stats.margem.toFixed(0)}%` },
    { rotulo: "Lucro", valor: brl0(stats.lucro), sub: `${periodoLabel}` },
    { rotulo: "Clientes novos", valor: String(stats.clientesNovos), sub: "no período" },
    { rotulo: "Não renovaram", valor: String(stats.naoRenovaram), sub: `taxa de perda de ${stats.taxaPerdaPct.toFixed(0)}%` },
  ];
  const tileW = (larguraUtil - 24) / 4;
  tiles.forEach((t, i) => {
    const x = margin + i * (tileW + 8);
    pagina.drawRectangle({ x, y: y - 62, width: tileW, height: 62, color: rgb(0.95, 0.97, 0.97), borderColor: GRAY_LINE, borderWidth: 1 });
    pagina.drawText(t.rotulo.toUpperCase(), { x: x + 10, y: y - 18, size: 7, font: bold, color: GRAY_LABEL });
    pagina.drawText(truncarTexto(bold, t.valor, 15, tileW - 20), { x: x + 10, y: y - 38, size: 15, font: bold, color: NAVY });
    pagina.drawText(truncarTexto(regular, t.sub, 7.5, tileW - 20), { x: x + 10, y: y - 52, size: 7.5, font: regular, color: GRAY_LABEL });
  });
  y -= 62 + 30;

  pagina.drawText("RETENÇÃO DA CARTEIRA", { x: margin, y, size: 8, font: bold, color: GRAY_LABEL });
  y -= 16;
  pagina.drawText(`${stats.retencaoPct.toFixed(0)}% dos clientes ativos estão em dia`, { x: margin, y, size: 11, font: bold, color: NAVY });
  y -= 16;
  pagina.drawText(`${stats.emDia} em dia · ${stats.vencendo} vencendo · ${stats.vencidos} vencidos`, {
    x: margin,
    y,
    size: 9.5,
    font: regular,
    color: GRAY_LABEL,
  });
  y -= 34;

  if (maisVendidos.length > 0) {
    pagina.drawText(`O QUE MAIS VENDE (${periodoLabel.toUpperCase()})`, { x: margin, y, size: 8, font: bold, color: GRAY_LABEL });
    y -= 18;

    const colX = [margin, margin + larguraUtil * 0.5, margin + larguraUtil * 0.7, margin + larguraUtil * 0.85];
    const cabecalho = ["Produto / Plano", "Vendas", "Receita", "Lucro"];
    cabecalho.forEach((c, i) => pagina.drawText(c.toUpperCase(), { x: colX[i], y, size: 7.5, font: bold, color: GRAY_LABEL }));
    y -= 8;
    pagina.drawRectangle({ x: margin, y, width: larguraUtil, height: 1, color: GRAY_LINE });
    y -= 16;

    for (const m of maisVendidos.slice(0, 18)) {
      if (y < 60) break;
      pagina.drawText(truncarTexto(regular, m.nome, 9.5, colX[1] - margin - 8), { x: colX[0], y, size: 9.5, font: regular, color: NAVY });
      pagina.drawText(String(m.vendas), { x: colX[1], y, size: 9.5, font: regular, color: NAVY });
      pagina.drawText(brl0(m.receita), { x: colX[2], y, size: 9.5, font: bold, color: TEAL_DEEP });
      pagina.drawText(brl0(m.lucro), { x: colX[3], y, size: 9.5, font: bold, color: rgb(0.13, 0.55, 0.4) });
      y -= 18;
    }
  }

  const rodapeY = 36;
  pagina.drawRectangle({ x: margin, y: rodapeY + 16, width: larguraUtil, height: 1, color: GRAY_LINE });
  pagina.drawText("Gerado automaticamente pelo GestorPro", { x: margin, y: rodapeY, size: 7.5, font: regular, color: GRAY_LABEL });

  return pdf.save();
}
