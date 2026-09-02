export function brl(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function brl0(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function dataCurta(d: Date): string {
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function dataPorExtenso(d: Date): string {
  return String(d.getDate()).padStart(2, "0") + " " + MESES[d.getMonth()] + " " + d.getFullYear();
}

export function iniciais(nome: string): string {
  const partes = nome.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
}
