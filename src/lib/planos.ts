import { PlanoCliente } from "@/generated/prisma/enums";
import { diaCivilBr } from "@/lib/format";

export const PLANO_LABEL: Record<PlanoCliente, string> = {
  MENSAL: "Mensal",
  DOIS_MESES: "2 meses",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
};

export const PLANO_DIAS: Record<PlanoCliente, number> = {
  MENSAL: 31,
  DOIS_MESES: 62,
  TRIMESTRAL: 93,
  SEMESTRAL: 186,
};

export const PLANO_VALOR_SUGERIDO: Record<PlanoCliente, number> = {
  MENSAL: 25,
  DOIS_MESES: 50,
  TRIMESTRAL: 70,
  SEMESTRAL: 135,
};

export const PLANO_MESES: Record<PlanoCliente, number> = {
  MENSAL: 1,
  DOIS_MESES: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
};

export function calcularVencimento(plano: PlanoCliente, apartirDe: Date = new Date()): Date {
  const d = new Date(apartirDe);
  d.setDate(d.getDate() + PLANO_DIAS[plano]);
  return d;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

// Ajusta o vencimento natural do plano para cair sempre no mesmo dia do mês
// (ex: cliente que sempre paga todo dia 5). Nunca encurta o plano: se o dia
// fixo já passou muito antes do vencimento natural, empurra pro mês seguinte.
export function calcularVencimentoComDiaFixo(
  plano: PlanoCliente,
  apartirDe: Date = new Date(),
  diaFixo?: number | null
): Date {
  const alvo = calcularVencimento(plano, apartirDe);
  if (!diaFixo) return alvo;

  const { ano, mes } = diaCivilBr(alvo);
  const diaAjustado = Math.min(diaFixo, ultimoDiaDoMes(ano, mes));
  const candidato = new Date(ano, mes, diaAjustado);

  const seiseDiasAntes = new Date(alvo);
  seiseDiasAntes.setDate(seiseDiasAntes.getDate() - 6);
  if (candidato >= seiseDiasAntes) return candidato;

  const diaAjustado2 = Math.min(diaFixo, ultimoDiaDoMes(ano, mes + 1));
  return new Date(ano, mes + 1, diaAjustado2);
}

export function diasParaVencer(vencimento: Date, hoje: Date = new Date()): number {
  const msPorDia = 86400000;
  const vc = diaCivilBr(vencimento);
  const hc = diaCivilBr(hoje);
  const v = new Date(vc.ano, vc.mes, vc.dia);
  const h = new Date(hc.ano, hc.mes, hc.dia);
  return Math.round((v.getTime() - h.getTime()) / msPorDia);
}

export type FaixaVencimento = "VENCIDO" | "ATE_5_DIAS" | "EM_DIA";

export function faixaVencimento(vencimento: Date, hoje: Date = new Date()): FaixaVencimento {
  const dias = diasParaVencer(vencimento, hoje);
  if (dias < 0) return "VENCIDO";
  if (dias <= 5) return "ATE_5_DIAS";
  return "EM_DIA";
}
