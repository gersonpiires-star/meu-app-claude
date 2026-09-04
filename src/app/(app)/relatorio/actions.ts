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
