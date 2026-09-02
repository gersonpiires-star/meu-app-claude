"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { calcularVencimentoComDiaFixo } from "@/lib/planos";

export async function renovarComPlanoAtual(id: string) {
  const revendedor = await exigirRevendedor();
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id, revendedorId: revendedor.id } });

  const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
  const novoVencimento = calcularVencimentoComDiaFixo(cliente.plano, base, cliente.diaFixo);

  await prisma.$transaction([
    prisma.renovacao.create({
      data: { clienteId: id, plano: cliente.plano, valor: cliente.valorPlano, custo: 0 },
    }),
    prisma.cliente.update({
      where: { id },
      data: { vencimento: novoVencimento, status: "ATIVO", testeGratis: false },
    }),
  ]);

  revalidatePath("/clientes");
  revalidatePath("/painel");
  revalidatePath("/relatorio");
  revalidatePath("/clientes/renovar-em-lote");
}

export async function renovarVariosComPlanoAtual(ids: string[]) {
  for (const id of ids) {
    await renovarComPlanoAtual(id);
  }
}
