import { PlanoCliente } from "@/generated/prisma/enums";

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

export function diasParaVencer(vencimento: Date, hoje: Date = new Date()): number {
  const msPorDia = 86400000;
  const v = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((v.getTime() - h.getTime()) / msPorDia);
}

export type FaixaVencimento = "VENCIDO" | "ATE_5_DIAS" | "EM_DIA";

export function faixaVencimento(vencimento: Date, hoje: Date = new Date()): FaixaVencimento {
  const dias = diasParaVencer(vencimento, hoje);
  if (dias < 0) return "VENCIDO";
  if (dias <= 5) return "ATE_5_DIAS";
  return "EM_DIA";
}
