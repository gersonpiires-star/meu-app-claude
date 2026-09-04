"use server";

import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function marcarAvisosLidos() {
  const revendedor = await exigirRevendedor();
  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { avisosLidosAte: new Date() },
  });
}
