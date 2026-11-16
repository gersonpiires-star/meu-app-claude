"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { validarOuErro } from "@/lib/validacao";
import { registrarMovimentoEstoque } from "@/lib/dados";

const produtoSchema = z.object({
  modelo: z.string().trim().min(1, "Informe o modelo"),
  estoqueMinimo: z.coerce.number().int().min(0).default(0),
  quantidade: z.coerce.number().int().min(0).default(0),
  custoUnitario: z.coerce.number().min(0).default(0),
});

export async function criarProduto(formData: FormData): Promise<{ ok: false; erro: string } | void> {
  const revendedor = await exigirRevendedor();
  const validado = validarOuErro(produtoSchema, Object.fromEntries(formData));
  if (!validado.ok) return validado;
  const dados = validado.dados;

  const produto = await prisma.produto.create({
    data: {
      revendedorId: revendedor.id,
      modelo: dados.modelo,
      estoqueMinimo: dados.estoqueMinimo,
    },
  });

  if (dados.quantidade > 0) {
    await registrarMovimentoEstoque({
      produtoId: produto.id,
      tipo: "ENTRADA",
      quantidade: dados.quantidade,
      custoUnitario: dados.custoUnitario,
    });
  }

  revalidatePath("/estoque");
  revalidatePath("/painel");
}

const reporSchema = z.object({
  quantidade: z.coerce.number().int().min(1, "Informe a quantidade"),
  custoUnitario: z.coerce.number().min(0),
  fornecedor: z.string().trim().optional(),
});

export async function reporEstoque(produtoId: string, formData: FormData): Promise<{ ok: false; erro: string } | void> {
  const revendedor = await exigirRevendedor();
  const validado = validarOuErro(reporSchema, Object.fromEntries(formData));
  if (!validado.ok) return validado;
  const dados = validado.dados;

  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id: produtoId, revendedorId: revendedor.id },
  });

  await registrarMovimentoEstoque({
    produtoId: produto.id,
    tipo: "ENTRADA",
    quantidade: dados.quantidade,
    custoUnitario: dados.custoUnitario,
    fornecedor: dados.fornecedor || null,
  });

  revalidatePath("/estoque");
  revalidatePath("/painel");
}

const registrarEntradaSchema = reporSchema.extend({
  produtoId: z.string().min(1, "Selecione um produto"),
});

// Mesma coisa que reporEstoque, só que pro card "Registrar entrada" do
// Estoque — onde o produto é escolhido num <select> dentro do próprio
// formulário, em vez de já vir preso a um botão por produto.
export async function registrarEntrada(formData: FormData): Promise<{ ok: false; erro: string } | void> {
  const revendedor = await exigirRevendedor();
  const validado = validarOuErro(registrarEntradaSchema, Object.fromEntries(formData));
  if (!validado.ok) return validado;
  const dados = validado.dados;

  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id: dados.produtoId, revendedorId: revendedor.id },
  });

  await registrarMovimentoEstoque({
    produtoId: produto.id,
    tipo: "ENTRADA",
    quantidade: dados.quantidade,
    custoUnitario: dados.custoUnitario,
    fornecedor: dados.fornecedor || null,
  });

  revalidatePath("/estoque");
  revalidatePath("/painel");
}

const ajusteSchema = z.object({
  quantidadePerdida: z.coerce.number().int().min(1, "Informe a quantidade"),
  motivo: z.string().trim().min(1, "Informe o motivo"),
});

// Perda/quebra/extravio — a única saída de estoque hoje sem venda associada.
// Sem isso, perda real de mercadoria não tinha onde ser lançada: ou o
// revendedor simulava uma venda fictícia (distorcendo o relatório), ou o
// estoque sistêmico ficava pra sempre desalinhado da contagem física.
export async function ajustarEstoque(produtoId: string, formData: FormData): Promise<{ ok: false; erro: string } | void> {
  const revendedor = await exigirRevendedor();
  const validado = validarOuErro(ajusteSchema, Object.fromEntries(formData));
  if (!validado.ok) return validado;
  const dados = validado.dados;

  const produto = await prisma.produto.findUniqueOrThrow({
    where: { id: produtoId, revendedorId: revendedor.id },
  });

  await registrarMovimentoEstoque({
    produtoId: produto.id,
    tipo: "SAIDA",
    quantidade: dados.quantidadePerdida,
    observacao: dados.motivo,
  });

  revalidatePath("/estoque");
  revalidatePath("/painel");
}

// Nunca deleta: venda/movimento já lançados continuam precisando do
// Produto pra custo FIFO e relatório de meses passados — só sai dos
// seletores de nova venda/reposição (ver vendas/nova/page.tsx).
export async function arquivarProduto(id: string) {
  const revendedor = await exigirRevendedor();
  await prisma.produto.update({ where: { id, revendedorId: revendedor.id }, data: { arquivadoEm: new Date() } });
  revalidatePath("/estoque");
}

export async function desarquivarProduto(id: string) {
  const revendedor = await exigirRevendedor();
  await prisma.produto.update({ where: { id, revendedorId: revendedor.id }, data: { arquivadoEm: null } });
  revalidatePath("/estoque");
}
