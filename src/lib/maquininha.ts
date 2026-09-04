// Tabela de taxas de maquininha por número de parcelas e prazo de recebimento
// (referência de mercado). Cada linha: [parcelas, naHora, em14dias, em30dias]
const TAXAS: [number, number, number, number][] = [
  [2, 0.0579, 0.0574, 0.0569], [3, 0.0609, 0.0604, 0.0599], [4, 0.0799, 0.0794, 0.0789],
  [5, 0.0809, 0.0804, 0.0799], [6, 0.0819, 0.0814, 0.0809], [7, 0.0949, 0.0944, 0.0939],
  [8, 0.0968, 0.0963, 0.0958], [9, 0.1037, 0.1032, 0.1027], [10, 0.1105, 0.1100, 0.1095],
  [11, 0.1227, 0.1222, 0.1217], [12, 0.1238, 0.1233, 0.1228], [13, 0.1344, 0.1339, 0.1334],
  [14, 0.1451, 0.1446, 0.1441], [15, 0.1553, 0.1548, 0.1543], [16, 0.1663, 0.1658, 0.1653],
  [17, 0.1771, 0.1766, 0.1761], [18, 0.1899, 0.1894, 0.1889],
];

export type Prazo = 0 | 1 | 2;
export const PRAZO_LABEL: Record<Prazo, string> = { 0: "Na hora", 1: "14 dias", 2: "30 dias" };

export function taxaSugerida(parcelas: number, prazo: Prazo = 0): number {
  const n = Math.floor(parcelas) || 1;
  if (n <= 1) return 3.99;
  const linha = TAXAS.find((t) => t[0] === n);
  if (linha) return linha[prazo + 1] * 100;
  // Fora da tabela (mais de 18x, hoje não alcançável pela UI): usa a taxa
  // da maior parcela conhecida em vez do valor de 1x — subestimar a taxa
  // faria o revendedor cobrar barato demais e perder margem no cartão.
  return TAXAS[TAXAS.length - 1][prazo + 1] * 100;
}

export function precoAVista(custo: number, margemPct: number): number {
  const margem = Math.min(0.95, Math.max(0, margemPct / 100));
  if (margem >= 1) return custo;
  return custo / (1 - margem);
}

export function tabelaParcelado(precoBase: number, prazo: Prazo = 0, maxParcelas = 12) {
  const linhas = [];
  for (let n = 1; n <= maxParcelas; n++) {
    const taxa = taxaSugerida(n, prazo);
    const total = precoBase / (1 - taxa / 100);
    linhas.push({ parcelas: n, taxa, total, parcela: total / n });
  }
  return linhas;
}
