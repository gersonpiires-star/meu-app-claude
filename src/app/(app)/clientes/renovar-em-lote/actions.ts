"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { exigirRevendedor } from "@/lib/sessao";
import { PLANO_MESES, calcularVencimentoComDiaFixo } from "@/lib/planos";
import { erroCreditoIndisponivel } from "@/lib/plataformas";

class SemCreditoError extends Error {}

export async function renovarComPlanoAtual(id: string): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirRevendedor();

  try {
    // Lê e grava dentro da mesma transação serializável — senão um clique
    // duplo ou duas abas abertas podiam ambos ler o mesmo vencimento antigo
    // e gravar duas renovações pro mesmo cliente, duplicando receita/custo
    // no relatório (mesma corrida já corrigida em registrarVenda). A
    // checagem de crédito roda dentro dela também, senão dois cliques
    // simultâneos podiam ambos passar pela checagem e consumir o último
    // crédito duas vezes.
    await prisma.$transaction(
      async (tx) => {
        const cliente = await tx.cliente.findUniqueOrThrow({
          where: { id, revendedorId: revendedor.id },
          include: { servico: true },
        });

        const erroCredito = await erroCreditoIndisponivel(tx, cliente.servicoId);
        if (erroCredito) throw new SemCreditoError(erroCredito);

        const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
        const novoVencimento = calcularVencimentoComDiaFixo(cliente.plano, base, cliente.diaFixo);
        const custo = PLANO_MESES[cliente.plano] * (cliente.servico?.custoCredito ?? 0);

        await tx.renovacao.create({
          data: { clienteId: id, plano: cliente.plano, valor: cliente.valorPlano, custo },
        });
        await tx.cliente.update({
          where: { id },
          data: { vencimento: novoVencimento, status: "ATIVO", testeGratis: false },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (erro) {
    if (erro instanceof SemCreditoError) {
      return { erro: erro.message };
    }
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2034") {
      return { erro: "Esse cliente acabou de ser renovado em outra aba/clique — confira antes de tentar de novo." };
    }
    throw erro;
  }

  revalidatePath("/clientes");
  revalidatePath("/painel");
  revalidatePath("/relatorio");
  revalidatePath("/clientes/renovar-em-lote");
}

export async function renovarVariosComPlanoAtual(ids: string[]): Promise<{ erro: string } | undefined> {
  for (const id of ids) {
    const resultado = await renovarComPlanoAtual(id);
    if (resultado?.erro) return resultado;
  }
}
