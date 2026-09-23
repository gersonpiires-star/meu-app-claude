"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { exigirRevendedor } from "@/lib/sessao";
import { estoqueAtualProduto, custoConsumoFifo } from "@/lib/dados";
import { calcularVencimentoComDiaFixo } from "@/lib/planos";
import { erroCreditoIndisponivel } from "@/lib/plataformas";
import { snapshotDoCliente } from "@/lib/renovacao";
import { registrarLog } from "@/lib/log";
import { brl } from "@/lib/format";

const vendaSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto"),
  clienteId: z.string().trim().optional(),
  quantidade: z.coerce.number().int().min(1),
  valorUnitario: z.coerce.number().min(0),
  formaPagamento: z.string().trim().min(1, "Informe a forma de pagamento"),
  taxaPercentual: z.coerce.number().min(0).default(0),
  data: z.coerce.date().optional(),
});

class EstoqueInsuficienteError extends Error {
  constructor(readonly mensagem: string) {
    super(mensagem);
  }
}

class SemCreditoError extends Error {}

const planoSchema = z.enum(["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"]);

const comboSchema = z.object({
  clienteId: z.string().min(1, "Selecione um cliente"),
  produtoId: z.string().min(1, "Selecione um produto"),
  quantidade: z.coerce.number().int().min(1),
  valorAparelho: z.coerce.number().min(0),
  formaPagamento: z.string().trim().min(1, "Informe a forma de pagamento"),
  plano: planoSchema,
  valorPlano: z.coerce.number().min(0),
  custoPlano: z.coerce.number().min(0),
  apartirDoVencimento: z.coerce.boolean().default(false),
  data: z.coerce.date().optional(),
});

// Combo "Aparelho + assinatura" de Nova venda — cria a venda do aparelho
// (com baixa de estoque por FIFO, igual registrarVenda) e a renovação do
// plano (igual renovarCliente) NUMA SÓ TRANSAÇÃO, e liga as duas pelo
// Venda.renovacaoId — é essa ligação que faz a tela de Vendas juntar as
// duas linhas num "Combo" só, em vez de mostrar como duas vendas soltas.
export async function registrarCombo(formData: FormData): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirRevendedor();
  const dados = comboSchema.parse(Object.fromEntries(formData));

  const produto = await prisma.produto.findUnique({ where: { id: dados.produtoId, revendedorId: revendedor.id } });
  if (!produto) return { erro: "Produto não encontrado." };

  const cliente = await prisma.cliente.findUnique({ where: { id: dados.clienteId, revendedorId: revendedor.id } });
  if (!cliente) return { erro: "Cliente não encontrado." };

  let vendaId = "";
  try {
    await prisma.$transaction(
      async (tx) => {
        const estoque = await estoqueAtualProduto(dados.produtoId, tx);
        if (dados.quantidade > estoque) {
          throw new EstoqueInsuficienteError(
            estoque > 0
              ? `Estoque insuficiente — só há ${estoque} unidade${estoque === 1 ? "" : "s"} de ${produto.modelo} disponível${estoque === 1 ? "" : "is"}.`
              : `Sem estoque de ${produto.modelo} — repor antes de vender.`
          );
        }

        const erroCredito = await erroCreditoIndisponivel(tx, cliente.servicoId);
        if (erroCredito) throw new SemCreditoError(erroCredito);

        const { custoUnitario } = await custoConsumoFifo(dados.produtoId, dados.quantidade, tx);

        const base = dados.apartirDoVencimento || cliente.vencimento > new Date() ? cliente.vencimento : new Date();
        const novoVencimento = calcularVencimentoComDiaFixo(dados.plano, base, cliente.diaFixo);

        const renovacao = await tx.renovacao.create({
          data: {
            clienteId: dados.clienteId,
            servicoId: cliente.servicoId,
            plano: dados.plano,
            valor: dados.valorPlano,
            custo: dados.custoPlano,
            formaPagamento: dados.formaPagamento,
            snapshotAnterior: snapshotDoCliente(cliente),
            ...(dados.data ? { data: dados.data } : {}),
          },
        });
        await tx.cliente.update({
          where: { id: dados.clienteId },
          data: { plano: dados.plano, valorPlano: dados.valorPlano, vencimento: novoVencimento, status: "ATIVO", testeGratis: false },
        });

        const venda = await tx.venda.create({
          data: {
            revendedorId: revendedor.id,
            produtoId: dados.produtoId,
            clienteId: dados.clienteId,
            renovacaoId: renovacao.id,
            quantidade: dados.quantidade,
            valorUnitario: dados.valorAparelho,
            custoUnitario,
            formaPagamento: dados.formaPagamento,
            ...(dados.data ? { data: dados.data } : {}),
          },
        });
        vendaId = venda.id;
        await tx.movimentoEstoque.create({
          data: { produtoId: dados.produtoId, tipo: "SAIDA", quantidade: dados.quantidade, custoUnitario },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (erro) {
    if (erro instanceof EstoqueInsuficienteError) return { erro: erro.message };
    if (erro instanceof SemCreditoError) return { erro: erro.message };
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034") {
      return { erro: "Outro lançamento pra esse cliente foi registrado bem nesse instante — tente novamente." };
    }
    throw erro;
  }

  await registrarLog(
    revendedor.id,
    "vendas.combo",
    `Vendeu ${produto.modelo} + renovação (${brl(dados.valorAparelho + dados.valorPlano)}) para ${cliente.nome}`
  );

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  revalidatePath("/painel");
  revalidatePath("/relatorio");
  revalidatePath("/plataformas");
  revalidatePath(`/clientes/${dados.clienteId}`);
  redirect(`/vendas?recibo=${vendaId}`);
}

export async function registrarVenda(formData: FormData): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirRevendedor();
  const dados = vendaSchema.parse(Object.fromEntries(formData));

  const produto = await prisma.produto.findUnique({ where: { id: dados.produtoId, revendedorId: revendedor.id } });
  if (!produto) return { erro: "Produto não encontrado." };

  if (dados.clienteId) {
    const cliente = await prisma.cliente.findUnique({ where: { id: dados.clienteId, revendedorId: revendedor.id } });
    if (!cliente) return { erro: "Cliente não encontrado." };
  }

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
            ...(dados.data ? { data: dados.data } : {}),
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
  revalidatePath("/relatorio");
  redirect(dados.clienteId ? `/vendas?recibo=${vendaId}` : "/vendas");
}

// Vendas importadas do app antigo (ou registradas antes de o formulário
// pedir cliente) não têm cliente associado — sem isso não dá pra emitir
// recibo. Deixa vincular um cliente depois, direto na lista de Vendas.
export async function vincularClienteVenda(vendaId: string, clienteId: string): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirRevendedor();

  const venda = await prisma.venda.findFirst({ where: { id: vendaId, revendedorId: revendedor.id } });
  if (!venda) return { erro: "Venda não encontrada." };

  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, revendedorId: revendedor.id } });
  if (!cliente) return { erro: "Cliente não encontrado." };

  await prisma.venda.update({ where: { id: vendaId }, data: { clienteId } });
  revalidatePath("/vendas");
  revalidatePath("/relatorio");
}
