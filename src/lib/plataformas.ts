import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// Confere se o app do cliente está vinculado a uma plataforma sem crédito
// disponível, pra bloquear a renovação — usado tanto na renovação rápida
// (renovar-em-lote) quanto na renovação com plano/valor customizados
// (clientes/actions.ts). Aceita tanto o client normal quanto o `tx` de uma
// transação, pra poder checar dentro do mesmo lock que grava a renovação.
// App sem plataforma vinculada nunca bloqueia — a plataforma "em questão"
// só existe quando o app está mesmo ligado a uma.
export async function erroCreditoIndisponivel(
  db: Prisma.TransactionClient | typeof prisma,
  servicoId: string | null
): Promise<string | null> {
  if (!servicoId) return null;

  const servico = await db.servico.findUnique({ where: { id: servicoId }, select: { plataformaId: true } });
  if (!servico?.plataformaId) return null;

  const plataforma = await db.plataforma.findUnique({
    where: { id: servico.plataformaId },
    include: { lotes: true, servicos: { select: { id: true } } },
  });
  if (!plataforma) return null;

  const comprados = plataforma.lotes.reduce((a, l) => a + l.quantidade, 0);
  const servicoIds = plataforma.servicos.map((s) => s.id);
  const usados = await db.renovacao.count({ where: { cliente: { servicoId: { in: servicoIds } } } });
  const saldo = comprados - usados;

  if (saldo <= 0) {
    return `Sem créditos disponíveis em ${plataforma.nome}. Compre mais créditos em Plataformas antes de renovar.`;
  }
  return null;
}

// Soma o saldo de créditos de todas as plataformas do revendedor, pro
// resumo do Painel — sem uma consulta por plataforma como dadosPlataformas.
export async function saldoTotalCreditos(revendedorId: string): Promise<{ saldo: number; baixo: boolean }> {
  const plataformas = await prisma.plataforma.findMany({
    where: { revendedorId },
    include: { lotes: true, servicos: { select: { id: true } } },
  });
  if (plataformas.length === 0) return { saldo: 0, baixo: false };

  const servicoIds = plataformas.flatMap((p) => p.servicos.map((s) => s.id));
  const renovacoes = servicoIds.length
    ? await prisma.renovacao.findMany({
        where: { cliente: { servicoId: { in: servicoIds } } },
        select: { cliente: { select: { servicoId: true } } },
      })
    : [];
  const usadosPorServico = new Map<string, number>();
  for (const r of renovacoes) {
    const servicoId = r.cliente.servicoId;
    if (servicoId) usadosPorServico.set(servicoId, (usadosPorServico.get(servicoId) ?? 0) + 1);
  }

  let saldo = 0;
  let baixo = false;
  for (const p of plataformas) {
    const comprados = p.lotes.reduce((a, l) => a + l.quantidade, 0);
    const usados = p.servicos.reduce((a, s) => a + (usadosPorServico.get(s.id) ?? 0), 0);
    const saldoPlataforma = comprados - usados;
    saldo += saldoPlataforma;
    if (saldoPlataforma <= p.minimo) baixo = true;
  }
  return { saldo, baixo };
}

export async function dadosPlataformas(revendedorId: string) {
  const plataformas = await prisma.plataforma.findMany({
    where: { revendedorId },
    include: { lotes: true, servicos: { include: { _count: { select: { clientes: true } } } } },
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
