import { prisma } from "@/lib/prisma";

// Registra um clique no link de indicação — chamado a cada abertura de
// /cadastro?ref=<id>, mesmo que a pessoa desista e nunca complete o
// cadastro. Silencioso de propósito: um erro aqui (ex: id inexistente,
// banco fora do ar por um instante) nunca deve derrubar a página de
// cadastro pra quem só está tentando criar uma conta.
export async function registrarCliqueIndicacao(revendedorId: string): Promise<void> {
  try {
    const existe = await prisma.revendedor.findUnique({ where: { id: revendedorId }, select: { id: true } });
    if (!existe) return;
    await prisma.cliqueIndicacao.create({ data: { revendedorId } });
  } catch {
    // ver comentário acima — nunca propaga.
  }
}

// Funil completo do link de indicação de um revendedor: quantos cliques o
// link recebeu, quantos desses viraram cadastro, e quantos dos cadastrados
// de fato assinaram (pagamento de ASSINATURA aprovado alguma vez — o
// mesmo evento que libera o cupom de recompensa da indicação).
export async function funilIndicacao(revendedorId: string) {
  const [cliques, indicados] = await Promise.all([
    prisma.cliqueIndicacao.count({ where: { revendedorId } }),
    prisma.revendedor.findMany({ where: { indicadoPorId: revendedorId }, select: { id: true } }),
  ]);

  const idsIndicados = indicados.map((i) => i.id);
  const assinantesRaw = idsIndicados.length
    ? await prisma.pagamento.groupBy({
        by: ["revendedorId"],
        where: { revendedorId: { in: idsIndicados }, tipo: "ASSINATURA", status: "APROVADO" },
      })
    : [];

  return { cliques, cadastros: indicados.length, assinantes: assinantesRaw.length };
}

// Ranking dos revendedores que mais geram cliques no próprio link de
// indicação — pra achar quem mais divulga o GestorPro de verdade, não só
// quem "tem o link" (todo mundo tem).
export async function rankingIndicacao(limite = 10) {
  const porCliques = await prisma.cliqueIndicacao.groupBy({
    by: ["revendedorId"],
    _count: { _all: true },
    orderBy: { _count: { revendedorId: "desc" } },
    take: limite,
  });
  if (porCliques.length === 0) return [];

  const ids = porCliques.map((c) => c.revendedorId);
  const [revendedores, indicadosRaw] = await Promise.all([
    prisma.revendedor.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true } }),
    prisma.revendedor.findMany({ where: { indicadoPorId: { in: ids } }, select: { id: true, indicadoPorId: true } }),
  ]);
  const nomePorId = new Map(revendedores.map((r) => [r.id, r.nome]));

  const idsIndicados = indicadosRaw.map((i) => i.id);
  const pagamentosAprovados = idsIndicados.length
    ? await prisma.pagamento.groupBy({
        by: ["revendedorId"],
        where: { revendedorId: { in: idsIndicados }, tipo: "ASSINATURA", status: "APROVADO" },
      })
    : [];
  const idsComAssinatura = new Set(pagamentosAprovados.map((p) => p.revendedorId));

  const cadastrosPorIndicador = new Map<string, number>();
  const assinantesPorIndicador = new Map<string, number>();
  for (const i of indicadosRaw) {
    if (!i.indicadoPorId) continue;
    cadastrosPorIndicador.set(i.indicadoPorId, (cadastrosPorIndicador.get(i.indicadoPorId) ?? 0) + 1);
    if (idsComAssinatura.has(i.id)) {
      assinantesPorIndicador.set(i.indicadoPorId, (assinantesPorIndicador.get(i.indicadoPorId) ?? 0) + 1);
    }
  }

  return porCliques.map((c) => ({
    id: c.revendedorId,
    nome: nomePorId.get(c.revendedorId) ?? "—",
    cliques: c._count._all,
    cadastros: cadastrosPorIndicador.get(c.revendedorId) ?? 0,
    assinantes: assinantesPorIndicador.get(c.revendedorId) ?? 0,
  }));
}
