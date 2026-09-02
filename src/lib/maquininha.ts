// Tabela de taxas de maquininha por número de parcelas (referência de mercado).
// Cada linha: [parcelas, taxa]
const TAXAS: [number, number][] = [
  [2, 0.0579], [3, 0.0609], [4, 0.0799],
  [5, 0.0809], [6, 0.0819], [7, 0.0949],
  [8, 0.0968], [9, 0.1037], [10, 0.1105],
  [11, 0.1227], [12, 0.1238], [13, 0.1344],
  [14, 0.1451], [15, 0.1553], [16, 0.1663],
  [17, 0.1771], [18, 0.1899],
];

export function taxaSugerida(parcelas: number): number {
  const n = Math.floor(parcelas) || 1;
  if (n <= 1) return 3.99;
  const linha = TAXAS.find((t) => t[0] === n);
  return linha ? linha[1] * 100 : 3.99;
}

export function precoAVista(custo: number, margemPct: number): number {
  const margem = Math.min(0.95, Math.max(0, margemPct / 100));
  if (margem >= 1) return custo;
  return custo / (1 - margem);
}

export function tabelaParcelado(precoBase: number, maxParcelas = 12) {
  const linhas = [];
  for (let n = 1; n <= maxParcelas; n++) {
    const taxa = taxaSugerida(n);
    const total = precoBase / (1 - taxa / 100);
    linhas.push({ parcelas: n, taxa, total, parcela: total / n });
  }
  return linhas;
}
