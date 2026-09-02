"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor, exigirDono } from "@/lib/sessao";

const schema = z.object({
  mpAccessToken: z.string().trim().optional(),
  mpPublicKey: z.string().trim().optional(),
});

export async function salvarCredenciaisMP(formData: FormData) {
  const revendedor = await exigirDono();
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
  const revendedor = await exigirDono();
  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { mpAccessToken: null, mpPublicKey: null },
  });
  revalidatePath("/configuracoes");
}

export async function salvarSuspensaoAutomatica(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const texto = String(formData.get("diasParaCancelarAutomatico") ?? "").trim();
  const dias = texto ? Number(texto) : null;
  const valido = dias !== null && Number.isInteger(dias) && dias > 0 ? dias : null;

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { diasParaCancelarAutomatico: valido },
  });

  revalidatePath("/configuracoes");
}
