import { prisma } from "@/lib/prisma";

export type AvisoRevendedor = {
  id: string;
  titulo: string;
  mensagem: string;
  criadoEm: Date;
  lido: boolean;
};

// Comunicados da Administração GestorPro pro revendedor (destino
// TODOS_REVENDEDORES) — "lido" é calculado comparando com
// Revendedor.avisosLidosAte, não por registro individual, porque é só um
// sininho de notificação, não precisa granularidade por aviso.
export async function avisosParaRevendedor(revendedor: { id: string; avisosLidosAte: Date | null }) {
  const avisos = await prisma.aviso.findMany({
    where: { destino: "TODOS_REVENDEDORES" },
    orderBy: { criadoEm: "desc" },
    take: 20,
  });

  const lidosAte = revendedor.avisosLidosAte;
  const lista: AvisoRevendedor[] = avisos.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    mensagem: a.mensagem,
    criadoEm: a.criadoEm,
    lido: lidosAte != null && a.criadoEm <= lidosAte,
  }));

  return { avisos: lista, naoLidos: lista.filter((a) => !a.lido).length };
}
