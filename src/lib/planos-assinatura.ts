// Preço da ASSINATURA do GestorPro (o que o revendedor paga pra usar o
// app) — não confundir com PLANO_CLIENTE em planos.ts, que é o plano que
// o revendedor vende pros clientes dele.
export const PRECO_MENSAL = 79.99;

// Desconto cresce com o tempo de compromisso — semestral ganha um desconto
// menor que o anual, pra cada plano ter um motivo claro de existir (em vez
// de semestral e anual caírem no mesmo valor por mês).
const DESCONTO_SEMESTRAL = 0.1; // 10% sobre 6 meses
export const PRECO_SEMESTRAL = Math.round(PRECO_MENSAL * 6 * (1 - DESCONTO_SEMESTRAL) * 100) / 100;
export const PRECO_SEMESTRAL_MENSALIZADO = Math.round(PRECO_SEMESTRAL / 6);

// Anual = paga o equivalente a 10 meses e fica com 12 (2 meses de bônus).
const MESES_PAGOS_NO_ANUAL = 10;
export const PRECO_ANUAL = Math.round(PRECO_MENSAL * MESES_PAGOS_NO_ANUAL * 100) / 100;
export const PRECO_ANUAL_MENSALIZADO = Math.round(PRECO_ANUAL / 12);

export const PLANOS_ASSINATURA = {
  MENSAL: { valor: PRECO_MENSAL, meses: 1, titulo: "GestorPro — plano mensal" },
  SEMESTRAL: { valor: PRECO_SEMESTRAL, meses: 6, titulo: "GestorPro — plano semestral" },
  ANUAL: { valor: PRECO_ANUAL, meses: 12, titulo: "GestorPro — plano anual" },
} as const;

export type PlanoAssinaturaChave = keyof typeof PLANOS_ASSINATURA;

// Deriva o plano (pra rótulo/relatório) a partir de quantos meses um
// pagamento cobriu — usado tanto no webhook (aprovação real) quanto no
// admin (liberação manual de acesso), pra nunca desalinhar os dois.
export function planoDosMeses(meses: number): PlanoAssinaturaChave {
  if (meses >= 12) return "ANUAL";
  if (meses >= 6) return "SEMESTRAL";
  return "MENSAL";
}

// Soma meses a uma data sem o bug clássico do Date.setMonth: pular pro dia
// 1 antes de avançar o mês evita o "transbordo" quando o mês de destino tem
// menos dias (ex: 31/jan + 1 mês viraria 03/mar em vez de 28/fev). Usado
// pra empurrar o vencimento da ASSINATURA do GestorPro — tanto no webhook
// quanto na liberação manual de acesso pelo admin.
export function adicionarMeses(data: Date, meses: number): Date {
  const dia = data.getDate();
  const alvo = new Date(data);
  alvo.setDate(1);
  alvo.setMonth(alvo.getMonth() + meses);
  const ultimoDiaDoMesAlvo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  alvo.setDate(Math.min(dia, ultimoDiaDoMesAlvo));
  return alvo;
}
