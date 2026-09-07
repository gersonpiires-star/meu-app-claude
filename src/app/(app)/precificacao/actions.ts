"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function salvarMargemPadrao(margemPadrao: number) {
  const revendedor = await exigirRevendedor();
  const margem = Math.min(95, Math.max(0, margemPadrao));

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { margemPadrao: margem },
  });

  revalidatePath("/precificacao");
  revalidatePath("/vendas/nova");
}

// Salva de uma vez as taxas de todas as parcelas que o revendedor editou
// (o extrato da própria maquininha) — clicar em "Salvar" grava tudo e a
// tabela volta pro modo fixo/leitura; parcela que não foi tocada continua
// usando a taxa de referência. Guardado como JSON (chave = número da
// parcela) pra não precisar de uma tabela nova só pra isso.
export async function salvarTaxasCartao(taxas: Record<number, number>) {
  const revendedor = await exigirRevendedor();

  const limpo: Record<string, number> = {};
  for (const [parcela, taxa] of Object.entries(taxas)) {
    const n = Number(parcela);
    if (Number.isInteger(n) && n >= 1 && n <= 12 && Number.isFinite(taxa)) {
      limpo[String(n)] = Math.min(99, Math.max(0, taxa));
    }
  }

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { taxasCartaoPersonalizadas: limpo },
  });

  revalidatePath("/precificacao");
}
