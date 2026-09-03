export type FaixaPontualidade =
  | "SEM_HISTORICO"
  | "PAGA_SOZINHO"
  | "PAGA_NA_LEMBRANCA"
  | "PRECISA_INSISTIR"
  | "SO_PAGA_COBRADO";

// Pontualidade: quantas cobranças foram precisas por pagamento recebido.
// Réplica das faixas do protótipo original (Claude Design).
export function faixaPontualidade(
  cobrancas: number,
  pagamentos: number
): { faixa: FaixaPontualidade; label: string; razao: number } {
  const razao = pagamentos > 0 ? cobrancas / pagamentos : 0;
  if (pagamentos === 0) return { faixa: "SEM_HISTORICO", label: "Sem histórico", razao };
  if (razao <= 1.05) return { faixa: "PAGA_SOZINHO", label: "Paga sozinho", razao };
  if (razao <= 2.05) return { faixa: "PAGA_NA_LEMBRANCA", label: "Paga na lembrança", razao };
  if (razao <= 3.05) return { faixa: "PRECISA_INSISTIR", label: "Precisa insistir", razao };
  return { faixa: "SO_PAGA_COBRADO", label: "Só paga cobrado", razao };
}
