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

export function dataHora(d: Date): string {
  return dataPorExtenso(d) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

export function iniciais(nome: string): string {
  const partes = nome.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
}

// Formata um WhatsApp salvo com DDI (55...) como "DDD NNNNN-NNNN" pra exibição.
export function fmtTelefone(tel?: string | null): string {
  if (!tel) return "—";
  let d = tel.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `${ddd} ${resto}`;
  const corte = resto.length > 8 ? 5 : 4;
  return `${ddd} ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}
