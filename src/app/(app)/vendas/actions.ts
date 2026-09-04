"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { exigirRevendedor } from "@/lib/sessao";
import { estoqueAtualProduto, custoConsumoFifo } from "@/lib/dados";

const vendaSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto"),
  clienteId: z.string().trim().optional(),
  quantidade: z.coerce.number().int().min(1),
  valorUnitario: z.coerce.number().min(0),
  formaPagamento: z.string().trim().min(1, "Informe a forma de pagamento"),
  taxaPercentual: z.coerce.number().min(0).default(0),
});

class EstoqueInsuficienteError extends Error {
  constructor(readonly mensagem: string) {
    super(mensagem);
  }
}

export async function registrarVenda(formData: FormData): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirRevendedor();
  const dados = vendaSchema.parse(Object.fromEntries(formData));

  const produto = await prisma.produto.findUnique({ where: { id: dados.produtoId, revendedorId: revendedor.id } });
  if (!produto) return { erro: "Produto não encontrado." };

  let vendaId = "";
  try {
    await prisma.$transaction(
      async (tx) => {
        // Checa e grava dentro da mesma transação serializável — senão duas
        // vendas do mesmo produto ao mesmo tempo podiam ambas passar na
        // checagem (feita antes, fora da transação) e deixar o estoque
        // negativo.
        const estoque = await estoqueAtualProduto(dados.produtoId, tx);
        if (dados.quantidade > estoque) {
          throw new EstoqueInsuficienteError(
            estoque > 0
              ? `Estoque insuficiente — só há ${estoque} unidade${estoque === 1 ? "" : "s"} de ${produto.modelo} disponível${estoque === 1 ? "" : "is"}.`
              : `Sem estoque de ${produto.modelo} — repor antes de vender.`
          );
        }

        // Custo real (FIFO) dos lotes que essa venda consome — gravado na
        // venda pra sempre, não recalculado depois se o custo médio mudar.
        const { custoUnitario } = await custoConsumoFifo(dados.produtoId, dados.quantidade, tx);

        const venda = await tx.venda.create({
          data: {
            revendedorId: revendedor.id,
            produtoId: dados.produtoId,
            clienteId: dados.clienteId || null,
            quantidade: dados.quantidade,
            valorUnitario: dados.valorUnitario,
            custoUnitario,
            formaPagamento: dados.formaPagamento,
            taxaPercentual: dados.taxaPercentual,
          },
        });
        vendaId = venda.id;
        await tx.movimentoEstoque.create({
          data: {
            produtoId: dados.produtoId,
            tipo: "SAIDA",
            quantidade: dados.quantidade,
            custoUnitario,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) return { erro: erro.mensagem };
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034") {
      return { erro: "Outra venda desse produto foi registrada bem nesse instante — tente novamente." };
    }
    throw erro;
  }

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/painel");
  redirect(dados.clienteId ? `/vendas?recibo=${vendaId}` : "/vendas");
}
