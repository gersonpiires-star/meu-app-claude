import { prisma } from "@/lib/prisma";

type CupomValido = { id: string; codigo: string; tipo: "PERCENTUAL" | "FIXO"; valor: number };

// Confere o cupom contra o banco (nunca confia no que o form diz sobre ele
// estar válido) — ativo, dentro da validade e do limite de usos.
export async function validarCupom(codigoDigitado: string): Promise<{ cupom: CupomValido } | { erro: string }> {
  const codigo = codigoDigitado.trim().toUpperCase();
  if (!codigo) return { erro: "Informe o código do cupom." };

  const cupom = await prisma.cupom.findUnique({ where: { codigo } });
  if (!cupom) return { erro: "Cupom não encontrado." };
  if (!cupom.ativo) return { erro: "Esse cupom não está mais ativo." };
  if (cupom.validoAte && cupom.validoAte < new Date()) return { erro: "Esse cupom expirou." };
  if (cupom.usoMaximo != null && cupom.usosCount >= cupom.usoMaximo) {
    return { erro: "Esse cupom já atingiu o limite de usos." };
  }

  return { cupom: { id: cupom.id, codigo: cupom.codigo, tipo: cupom.tipo, valor: cupom.valor } };
}

export function aplicarDesconto(valor: number, cupom: { tipo: "PERCENTUAL" | "FIXO"; valor: number }): number {
  const desconto = cupom.tipo === "PERCENTUAL" ? valor * (cupom.valor / 100) : cupom.valor;
  return Math.max(0, Math.round((valor - desconto) * 100) / 100);
}
