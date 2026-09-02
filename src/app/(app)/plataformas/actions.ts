"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

const plataformaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do fornecedor"),
  minimo: z.coerce.number().int().min(0).default(0),
});

export async function criarPlataforma(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = plataformaSchema.parse(Object.fromEntries(formData));

  await prisma.plataforma.create({
    data: { revendedorId: revendedor.id, nome: dados.nome, minimo: dados.minimo },
  });

  revalidatePath("/plataformas");
}

const loteSchema = z.object({
  quantidade: z.coerce.number().int().min(1, "Informe a quantidade"),
  valorPago: z.coerce.number().min(0),
});

export async function adicionarLote(plataformaId: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = loteSchema.parse(Object.fromEntries(formData));

  const plataforma = await prisma.plataforma.findUniqueOrThrow({
    where: { id: plataformaId, revendedorId: revendedor.id },
  });

  await prisma.lotePlataforma.create({
    data: { plataformaId: plataforma.id, quantidade: dados.quantidade, valorPago: dados.valorPago },
  });

  revalidatePath("/plataformas");
}
