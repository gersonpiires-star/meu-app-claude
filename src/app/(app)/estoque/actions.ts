"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

const produtoSchema = z.object({
  modelo: z.string().trim().min(1, "Informe o modelo"),
  estoqueMinimo: z.coerce.number().int().min(0).default(0),
  quantidade: z.coerce.number().int().min(0).default(0),
  custoUnitario: z.coerce.number().min(0).default(0),
});

export async function criarProduto(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = produtoSchema.parse(Object.fromEntries(formData));

  const produto = await prisma.produto.create({
    data: {
      revendedorId: revendedor.id,
      modelo: dados.modelo,
      estoqueMinimo: dados.estoqueMinimo,
    },
  });

  if (dados.quantidade > 0) {
    await prisma.movimentoEstoque.create({
      data: {
        produtoId: produto.id,
        tipo: "ENTRADA",
        quantidade: dados.quantidade,
        custoUnitario: dados.custoUnitario,
      },
    });
  }

  revalidatePath("/estoque");
  revalidatePath("/painel");
}

const reporSchema = z.object({
  quantidade: z.coerce.number().int().min(1, "Informe a quantidade"),
  custoUnitario: z.coerce.number().min(0),
});

export async function reporEstoque(produtoId: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = reporSchema.parse(Object.fromEntries(formData));

  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id: produtoId, revendedorId: revendedor.id },
  });

  await prisma.movimentoEstoque.create({
    data: {
      produtoId: produto.id,
      tipo: "ENTRADA",
      quantidade: dados.quantidade,
      custoUnitario: dados.custoUnitario,
    },
  });

  revalidatePath("/estoque");
  revalidatePath("/painel");
}
