"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function publicarAvisoEmMassa({
  titulo,
  mensagem,
  servicoId,
  clienteIds,
  novoValor,
}: {
  titulo: string;
  mensagem: string;
  servicoId?: string;
  clienteIds: string[];
  novoValor?: number;
}) {
  const revendedor = await exigirRevendedor();
  if (!titulo.trim() || !mensagem.trim()) return { ok: false, erro: "Preencha título e mensagem." };

  await prisma.aviso.create({
    data: {
      revendedorId: revendedor.id,
      servicoId: servicoId || null,
      destino: servicoId ? "CLIENTES_DO_SERVICO" : "TODOS_CLIENTES",
      titulo,
      mensagem,
    },
  });

  if (novoValor && novoValor > 0 && clienteIds.length > 0) {
    await prisma.cliente.updateMany({
      where: { id: { in: clienteIds }, revendedorId: revendedor.id },
      data: { valorPlano: novoValor },
    });
  }

  revalidatePath("/clientes");
  revalidatePath("/painel");
  return { ok: true };
}

export async function registrarAvisoEnviado(clienteId: string, modelo: string) {
  const revendedor = await exigirRevendedor();
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId, revendedorId: revendedor.id } });
  if (!cliente) return;
  await prisma.avisoEnvio.upsert({
    where: { clienteId_modelo: { clienteId, modelo } },
    update: { enviadoEm: new Date() },
    create: { clienteId, modelo },
  });
  revalidatePath("/clientes/aviso-em-massa");
}
