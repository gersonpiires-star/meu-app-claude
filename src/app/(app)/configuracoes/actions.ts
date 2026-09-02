"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

const schema = z.object({
  mpAccessToken: z.string().trim().optional(),
  mpPublicKey: z.string().trim().optional(),
});

export async function salvarCredenciaisMP(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = schema.parse(Object.fromEntries(formData));

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: {
      mpAccessToken: dados.mpAccessToken || null,
      mpPublicKey: dados.mpPublicKey || null,
    },
  });

  revalidatePath("/configuracoes");
}

export async function removerCredenciaisMP() {
  const revendedor = await exigirRevendedor();
  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { mpAccessToken: null, mpPublicKey: null },
  });
  revalidatePath("/configuracoes");
}
