// Preço da ASSINATURA do GestorPro (o que o revendedor paga pra usar o
// app) — não confundir com PLANO_CLIENTE em planos.ts, que é o plano que
// o revendedor vende pros clientes dele.
export const PRECO_MENSAL = 99.99;

// Anual = paga o equivalente a 10 meses e fica com 12 (2 meses de bônus) —
// o mesmo cálculo já usado antes pro plano de R$29 (290 = 29 × 10).
const MESES_PAGOS_NO_ANUAL = 10;
export const PRECO_ANUAL = Math.round(PRECO_MENSAL * MESES_PAGOS_NO_ANUAL * 100) / 100;
export const PRECO_ANUAL_MENSALIZADO = Math.round(PRECO_ANUAL / 12);

export const PLANOS_ASSINATURA = {
  MENSAL: { valor: PRECO_MENSAL, meses: 1, titulo: "GestorPro — plano mensal" },
  ANUAL: { valor: PRECO_ANUAL, meses: 12, titulo: "GestorPro — plano anual" },
} as const;
