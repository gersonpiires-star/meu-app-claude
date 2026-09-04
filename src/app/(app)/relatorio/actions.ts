"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { dataCurta } from "@/lib/format";

// Uma renovação guarda o valor e o custo de crédito de quando foi lançada —
// de propósito, pra relatórios de meses passados não mudarem se o preço do
// serviço for reajustado depois. Isso significa que se o custo do serviço
// mudar ENTRE o lançamento de duas renovações, elas ficam com custos
// diferentes mesmo sendo do mesmo serviço — não é bug, mas se a renovação
// foi lançada com o valor errado (ex: custo do serviço desatualizado no
// momento), essa ação corrige o registro específico.
export async function editarRenovacao(
  renovacaoId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const revendedor = await exigirDono();

  const valor = Number(formData.get("valor"));
  const custo = Number(formData.get("custo"));
  if (!Number.isFinite(valor) || valor < 0) return { ok: false, erro: "Valor inválido." };
  if (!Number.isFinite(custo) || custo < 0) return { ok: false, erro: "Custo inválido." };

  const renovacao = await prisma.renovacao.findFirst({
    where: { id: renovacaoId, cliente: { revendedorId: revendedor.id } },
    include: { cliente: true },
  });
  if (!renovacao) return { ok: false, erro: "Renovação não encontrada." };

  await prisma.renovacao.update({ where: { id: renovacaoId }, data: { valor, custo } });

  await registrarLog(
    revendedor.id,
    "renovacao.editar",
    `Corrigiu a renovação de ${renovacao.cliente.nome} (${dataCurta(renovacao.data)}): valor ${renovacao.valor} → ${valor}, custo ${renovacao.custo} → ${custo}`
  );

  revalidatePath("/relatorio");
  revalidatePath("/painel");
  revalidatePath(`/clientes/${renovacao.clienteId}`);

  return { ok: true };
}

// Mesma ideia da editarRenovacao acima, pra vendas de aparelho: o custo é
// gravado por FIFO no momento da venda e nunca recalculado sozinho depois —
// vendas feitas antes desse controle existir (ou importadas sem custo por
// unidade) ficam com custo 0 até serem corrigidas manualmente aqui.
export async function editarVenda(
  vendaId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const revendedor = await exigirDono();

  const valorUnitario = Number(formData.get("valorUnitario"));
  const custoUnitario = Number(formData.get("custoUnitario"));
  if (!Number.isFinite(valorUnitario) || valorUnitario < 0) return { ok: false, erro: "Valor inválido." };
  if (!Number.isFinite(custoUnitario) || custoUnitario < 0) return { ok: false, erro: "Custo inválido." };

  const venda = await prisma.venda.findFirst({
    where: { id: vendaId, revendedorId: revendedor.id },
    include: { produto: true },
  });
  if (!venda) return { ok: false, erro: "Venda não encontrada." };

  await prisma.venda.update({ where: { id: vendaId }, data: { valorUnitario, custoUnitario } });

  await registrarLog(
    revendedor.id,
    "venda.editar",
    `Corrigiu a venda de ${venda.produto.modelo} (${dataCurta(venda.data)}): valor/un ${venda.valorUnitario} → ${valorUnitario}, custo/un ${venda.custoUnitario} → ${custoUnitario}`
  );

  revalidatePath("/relatorio");
  revalidatePath("/painel");
  revalidatePath("/vendas");

  return { ok: true };
}
