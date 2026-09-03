"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function registrarCobranca(clienteId: string, modelo: string) {
  const revendedor = await exigirRevendedor();
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId, revendedorId: revendedor.id } });
  if (!cliente) return;
  await prisma.cobranca.create({ data: { clienteId, modelo } });
  revalidatePath(`/clientes/${clienteId}`);
}
