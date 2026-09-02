"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

const chaveSchema = z.object({
  tipo: z.string().trim().min(1, "Escolha o tipo"),
  valor: z.string().trim().min(1, "Informe a chave"),
});

export async function criarChavePix(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = chaveSchema.parse(Object.fromEntries(formData));

  await prisma.chavePix.create({
    data: { revendedorId: revendedor.id, tipo: dados.tipo, valor: dados.valor },
  });

  revalidatePath("/configuracoes");
}

export async function excluirChavePix(id: string) {
  const revendedor = await exigirRevendedor();
  await prisma.chavePix.delete({ where: { id, revendedorId: revendedor.id } });
  revalidatePath("/configuracoes");
}
