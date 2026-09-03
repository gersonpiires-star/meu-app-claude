"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { estoqueAtualProduto } from "@/lib/dados";

const vendaSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto"),
  clienteId: z.string().trim().optional(),
  quantidade: z.coerce.number().int().min(1),
  valorUnitario: z.coerce.number().min(0),
  formaPagamento: z.string().trim().min(1, "Informe a forma de pagamento"),
  taxaPercentual: z.coerce.number().min(0).default(0),
});

export async function registrarVenda(formData: FormData): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirRevendedor();
  const dados = vendaSchema.parse(Object.fromEntries(formData));

  const produto = await prisma.produto.findUnique({ where: { id: dados.produtoId, revendedorId: revendedor.id } });
  if (!produto) return { erro: "Produto não encontrado." };

  const estoque = await estoqueAtualProduto(dados.produtoId);
  if (dados.quantidade > estoque) {
    return {
      erro:
        estoque > 0
          ? `Estoque insuficiente — só há ${estoque} unidade${estoque === 1 ? "" : "s"} de ${produto.modelo} disponível${estoque === 1 ? "" : "is"}.`
          : `Sem estoque de ${produto.modelo} — repor antes de vender.`,
    };
  }

  await prisma.$transaction([
    prisma.venda.create({
      data: {
        revendedorId: revendedor.id,
        produtoId: dados.produtoId,
        clienteId: dados.clienteId || null,
        quantidade: dados.quantidade,
        valorUnitario: dados.valorUnitario,
        formaPagamento: dados.formaPagamento,
        taxaPercentual: dados.taxaPercentual,
      },
    }),
    prisma.movimentoEstoque.create({
      data: {
        produtoId: dados.produtoId,
        tipo: "SAIDA",
        quantidade: dados.quantidade,
        custoUnitario: 0,
      },
    }),
  ]);

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/painel");
  redirect("/vendas");
}
