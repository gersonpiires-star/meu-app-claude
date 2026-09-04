// Todo o app roda em servidores que costumam estar em UTC (Vercel), mas o
// revendedor está no Brasil — por isso toda formatação de data/hora abaixo
// é fixada no fuso de Brasília, senão a hora exibida (e o "cobrado hoje")
// saem errados. O Brasil não observa mais horário de verão desde 2019, então
// o fuso é sempre UTC-3, sem ambiguidade.
const FUSO = "America/Sao_Paulo";

function partesBr(d: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const obter = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return { ano: obter("year"), mes: obter("month"), dia: obter("day"), hora: obter("hour"), minuto: obter("minute") };
}

export function brl(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function brl0(n: number): string {
  return "R$ " + n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function dataCurta(d: Date): string {
  const { dia, mes } = partesBr(d);
  return `${dia}/${mes}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function dataPorExtenso(d: Date): string {
  const { dia, mes, ano } = partesBr(d);
  return `${dia} ${MESES[Number(mes) - 1]} ${ano}`;
}

export function horaCurta(d: Date): string {
  const { hora, minuto } = partesBr(d);
  return `${hora}:${minuto}`;
}

export function dataHora(d: Date): string {
  return `${dataPorExtenso(d)} ${horaCurta(d)}`;
}

// Início (00:00) do dia atual no fuso de Brasília, como instante UTC — usado
// pra saber se algo (ex: uma cobrança) aconteceu "hoje" pro revendedor.
export function inicioDoDiaBr(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = partesBr(referencia);
  return new Date(`${ano}-${mes}-${dia}T03:00:00.000Z`);
}

// Converte qualquer instante pro "dia civil" dele em Brasília, representado
// como um Date sem hora (meio-dia local do servidor, pra nunca cruzar de dia
// em cálculos de diferença). Use isso — nunca getFullYear()/getMonth()/getDate()
// direto num Date — sempre que precisar comparar/agrupar datas por dia ou mês
// (vencimentos, "hoje", limites de mês etc.): o servidor roda em UTC, e ler os
// campos locais de um Date direto pega o dia em UTC, que diverge do dia em
// Brasília (UTC-3) das 21h às 23h59 todo dia — e vira o mês errado no fim do
// mês inteiro. Ver também parseDataBr, pro caso de texto DD/MM/AAAA digitado.
export function diaCivilBr(d: Date): { ano: number; mes: number; dia: number } {
  const { ano, mes, dia } = partesBr(d);
  return { ano: Number(ano), mes: Number(mes) - 1, dia: Number(dia) };
}

// Constrói o instante UTC correspondente à meia-noite de um DD/MM/AAAA
// digitado pelo revendedor, no fuso de Brasília — usar sempre que uma data
// digitada vira um Date, senão ela desalinha com a exibição (que já usa
// esse fuso) num servidor rodando em UTC: meia-noite de Brasília salva
// como "meia-noite UTC" viraria o dia anterior ao ser exibida de volta.
export function parseDataBr(texto?: string | null): Date | null {
  if (!texto) return null;
  const [dia, mes, ano] = texto.split("/").map(Number);
  if (!dia || !mes || !ano) return null;
  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0));
}

// Mesma construção de parseDataBr, mas a partir de ano/mês(0-indexado)/dia já
// numéricos (o formato que diaCivilBr devolve) — pra montar limites de
// mês/dia que vão direto pra uma query no banco. NUNCA use `new Date(ano,
// mes, dia)` puro pra isso: aquilo monta meia-noite no fuso do servidor, que
// em produção é UTC — quando esse instante volta pra diaCivilBr(), ele cai
// às 21h do dia anterior em Brasília, e um "dia 1 do mês" vira o mês
// anterior inteiro. Foi exatamente esse desvio que fazia o Relatório mostrar
// vendas do mês errado.
export function brMidnightUTC(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes, dia, 3, 0, 0));
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
