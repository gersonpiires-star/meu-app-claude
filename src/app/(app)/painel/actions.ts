"use server";

import { revalidatePath } from "next/cache";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";

export async function definirMetaMensal(valor: number) {
  const revendedor = await exigirRevendedor();
  const valorSeguro = Number.isFinite(valor) && valor > 0 ? valor : null;
  await prisma.revendedor.update({ where: { id: revendedor.id }, data: { metaReceitaMensal: valorSeguro } });
  revalidatePath("/painel");
}
