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
