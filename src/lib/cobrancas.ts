import { prisma } from "@/lib/prisma";

// Mapa clienteId -> horário da cobrança mais recente enviada hoje. Usado
// pra desativar o botão "Cobrar" depois do primeiro envio do dia — ele
// volta a ficar ativo sozinho na virada do dia.
export async function cobradosHojePorCliente(revendedorId: string): Promise<Map<string, Date>> {
  const hoje0 = new Date();
  hoje0.setHours(0, 0, 0, 0);

  const cobrancas = await prisma.cobranca.findMany({
    where: { cliente: { revendedorId }, criadoEm: { gte: hoje0 } },
    orderBy: { criadoEm: "desc" },
    select: { clienteId: true, criadoEm: true },
  });

  const mapa = new Map<string, Date>();
  for (const c of cobrancas) {
    if (!mapa.has(c.clienteId)) mapa.set(c.clienteId, c.criadoEm);
  }
  return mapa;
}
