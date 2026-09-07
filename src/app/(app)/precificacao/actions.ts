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

// Sobrescreve a taxa de UMA parcela com o que o revendedor vê no extrato da
// própria maquininha — as outras parcelas continuam usando a tabela de
// referência até serem editadas também. Guardado como JSON (chave = número
// da parcela) pra não precisar de uma tabela nova só pra isso.
export async function salvarTaxaCartao(parcelas: number, taxaPercent: number) {
  const revendedor = await exigirRevendedor();
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12) return;
  const taxa = Math.min(99, Math.max(0, taxaPercent));

  const atual = await prisma.revendedor.findUniqueOrThrow({
    where: { id: revendedor.id },
    select: { taxasCartaoPersonalizadas: true },
  });
  const taxas = (atual.taxasCartaoPersonalizadas as Record<string, number> | null) ?? {};
  taxas[String(parcelas)] = taxa;

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { taxasCartaoPersonalizadas: taxas },
  });

  revalidatePath("/precificacao");
}

// Volta a parcela pra taxa de referência (remove a personalização).
export async function restaurarTaxaCartao(parcelas: number) {
  const revendedor = await exigirRevendedor();

  const atual = await prisma.revendedor.findUniqueOrThrow({
    where: { id: revendedor.id },
    select: { taxasCartaoPersonalizadas: true },
  });
  const taxas = (atual.taxasCartaoPersonalizadas as Record<string, number> | null) ?? {};
  delete taxas[String(parcelas)];

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { taxasCartaoPersonalizadas: taxas },
  });

  revalidatePath("/precificacao");
}
