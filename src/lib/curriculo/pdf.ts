import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Curriculo } from "./schema";

const A4 = { w: 595, h: 842 };
const MARGEM = 48;

const CORES = {
  classico: { destaque: rgb(0.1, 0.1, 0.1), faixa: null },
  moderno: { destaque: rgb(0.11, 0.35, 0.62), faixa: rgb(0.11, 0.35, 0.62) },
} as const;

const TEXTO = rgb(0.13, 0.13, 0.13);
const CINZA = rgb(0.42, 0.42, 0.42);
const LINHA = rgb(0.82, 0.82, 0.82);

// As fontes padrão do PDF só desenham o alfabeto latino (WinAnsi): qualquer
// caractere fora dele (emoji, aspas curvas de Word etc.) faz o pdf-lib lançar
// erro. Trocamos os mais comuns por equivalentes e descartamos o resto.
function limpar(font: PDFFont, texto: string): string {
  const suportados = new Set(font.getCharacterSet());
  return texto
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\t/g, " ")
    .split("")
    .filter((c) => c === "\n" || suportados.has(c.codePointAt(0)!))
    .join("");
}

function quebrarLinhas(font: PDFFont, texto: string, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    let atual = "";
    for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (font.widthOfTextAtSize(tentativa, tamanho) <= largura) {
        atual = tentativa;
      } else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

export async function gerarCurriculoPdf(dados: Curriculo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cor = CORES[dados.template];
  const largura = A4.w - MARGEM * 2;
  const t = (s: string) => limpar(regular, s);

  pdf.setTitle(`Currículo - ${t(dados.nome)}`);

  let pagina: PDFPage = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - MARGEM;

  function garantirEspaco(altura: number) {
    if (y - altura >= MARGEM) return;
    pagina = pdf.addPage([A4.w, A4.h]);
    y = A4.h - MARGEM;
  }

  function paragrafo(texto: string, opts: { fonte?: PDFFont; tamanho?: number; cor?: typeof TEXTO; recuo?: number } = {}) {
    const fonte = opts.fonte ?? regular;
    const tamanho = opts.tamanho ?? 10;
    const recuo = opts.recuo ?? 0;
    const passo = tamanho * 1.4;
    for (const linha of quebrarLinhas(fonte, limpar(fonte, texto), tamanho, largura - recuo)) {
      garantirEspaco(passo);
      y -= passo;
      if (linha) pagina.drawText(linha, { x: MARGEM + recuo, y, size: tamanho, font: fonte, color: opts.cor ?? TEXTO });
    }
  }

  function secao(titulo: string) {
    garantirEspaco(40);
    y -= 12;
    y -= 14;
    pagina.drawText(limpar(negrito, titulo.toUpperCase()), {
      x: MARGEM,
      y,
      size: 11,
      font: negrito,
      color: cor.destaque,
    });
    y -= 5;
    pagina.drawLine({
      start: { x: MARGEM, y },
      end: { x: A4.w - MARGEM, y },
      thickness: 0.8,
      color: cor.faixa ?? LINHA,
    });
    y -= 2;
  }

  // Cabeçalho: "clássico" centralizado e sóbrio; "moderno" com faixa colorida.
  const contatos = [dados.email, dados.telefone, dados.cidade].map((c) => t(c)).filter(Boolean).join("   |   ");
  if (cor.faixa) {
    const alturaFaixa = 96;
    pagina.drawRectangle({ x: 0, y: A4.h - alturaFaixa, width: A4.w, height: alturaFaixa, color: cor.faixa });
    pagina.drawText(t(dados.nome), { x: MARGEM, y: A4.h - 44, size: 24, font: negrito, color: rgb(1, 1, 1) });
    if (dados.cargo) {
      pagina.drawText(t(dados.cargo), { x: MARGEM, y: A4.h - 64, size: 12, font: regular, color: rgb(0.9, 0.94, 1) });
    }
    if (contatos) {
      pagina.drawText(contatos, { x: MARGEM, y: A4.h - 82, size: 9, font: regular, color: rgb(0.9, 0.94, 1) });
    }
    y = A4.h - alturaFaixa - 6;
  } else {
    const centralizar = (texto: string, tamanho: number, fonte: PDFFont) =>
      (A4.w - fonte.widthOfTextAtSize(texto, tamanho)) / 2;
    const nome = t(dados.nome);
    y -= 22;
    pagina.drawText(nome, { x: centralizar(nome, 24, negrito), y, size: 24, font: negrito, color: TEXTO });
    if (dados.cargo) {
      y -= 18;
      const cargo = t(dados.cargo);
      pagina.drawText(cargo, { x: centralizar(cargo, 12, regular), y, size: 12, font: regular, color: CINZA });
    }
    if (contatos) {
      y -= 16;
      pagina.drawText(contatos, { x: centralizar(contatos, 9, regular), y, size: 9, font: regular, color: CINZA });
    }
    y -= 6;
  }

  if (dados.resumo) {
    secao("Resumo profissional");
    y -= 4;
    paragrafo(dados.resumo);
  }

  const experiencias = dados.experiencias.filter((e) => e.cargo || e.empresa);
  if (experiencias.length) {
    secao("Experiência profissional");
    for (const exp of experiencias) {
      garantirEspaco(60); // não deixa o título sozinho no fim da página
      y -= 6;
      const titulo = [exp.cargo, exp.empresa].filter(Boolean).join(" - ");
      paragrafo(titulo, { fonte: negrito, tamanho: 10.5 });
      if (exp.periodo) paragrafo(exp.periodo, { tamanho: 9, cor: CINZA });
      if (exp.descricao) paragrafo(exp.descricao);
    }
  }

  const formacoes = dados.formacoes.filter((f) => f.curso || f.instituicao);
  if (formacoes.length) {
    secao("Formação acadêmica");
    for (const f of formacoes) {
      garantirEspaco(45);
      y -= 6;
      paragrafo([f.curso, f.instituicao].filter(Boolean).join(" - "), { fonte: negrito, tamanho: 10.5 });
      if (f.periodo) paragrafo(f.periodo, { tamanho: 9, cor: CINZA });
    }
  }

  const habilidades = dados.habilidades.filter(Boolean);
  if (habilidades.length) {
    secao("Habilidades");
    y -= 4;
    paragrafo(habilidades.join("  •  "));
  }

  return pdf.save();
}
