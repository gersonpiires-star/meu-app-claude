"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";

const chaveSchema = z.object({
  tipo: z.string().trim().min(1, "Escolha o tipo"),
  valor: z.string().trim().min(1, "Informe a chave"),
});

// Só o dono mexe nas chaves Pix — é pra onde vão os pagamentos manuais dos
// clientes, então tem o mesmo nível de sensibilidade das credenciais do
// Mercado Pago (que já são exigirDono-only).
export async function criarChavePix(formData: FormData) {
  const revendedor = await exigirDono();
  const dados = chaveSchema.parse(Object.fromEntries(formData));

  await prisma.chavePix.create({
    data: { revendedorId: revendedor.id, tipo: dados.tipo, valor: dados.valor },
  });

  revalidatePath("/configuracoes");
}

export async function excluirChavePix(id: string) {
  const revendedor = await exigirDono();
  await prisma.chavePix.delete({ where: { id, revendedorId: revendedor.id } });
  revalidatePath("/configuracoes");
}
