import { prisma } from "@/lib/prisma";

export async function dadosPlataformas(revendedorId: string) {
  const plataformas = await prisma.plataforma.findMany({
    where: { revendedorId },
    include: { lotes: true, servicos: true },
    orderBy: { nome: "asc" },
  });

  const resultado = [];
  for (const p of plataformas) {
    const comprados = p.lotes.reduce((a, l) => a + l.quantidade, 0);
    const valorInvestido = p.lotes.reduce((a, l) => a + l.valorPago, 0);
    const servicoIds = p.servicos.map((s) => s.id);
    const usados = servicoIds.length
      ? await prisma.renovacao.count({ where: { cliente: { servicoId: { in: servicoIds } } } })
      : 0;
    resultado.push({
      ...p,
      comprados,
      valorInvestido,
      usados,
      saldo: comprados - usados,
      custoMedio: comprados > 0 ? valorInvestido / comprados : 0,
    });
  }
  return resultado;
}
