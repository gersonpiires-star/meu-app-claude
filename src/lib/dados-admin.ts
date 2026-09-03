import { prisma } from "@/lib/prisma";
import { limitesDoMes } from "@/lib/dados";

export async function dadosAdmin() {
  const agora = new Date();
  const { inicio, fim } = limitesDoMes(agora);
  const em3Dias = new Date(agora.getTime() + 3 * 24 * 60 * 60000);

  const [
    total,
    trial,
    ativos,
    pausados,
    interessadosAbertos,
    receitaAgg,
    pausadosMes,
    trialsVencendo,
  ] = await Promise.all([
    prisma.revendedor.count({ where: { papel: "REVENDEDOR" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "ATIVO" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "PAUSADO" } }),
    prisma.interessado.count({ where: { convertido: false } }),
    prisma.pagamento.aggregate({
      where: { tipo: "ASSINATURA", status: "APROVADO", atualizadoEm: { gte: inicio, lt: fim } },
      _sum: { valor: true },
    }),
    prisma.revendedor.count({
      where: { papel: "REVENDEDOR", statusAssinatura: "PAUSADO", pausadoEm: { gte: inicio, lt: fim } },
    }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL", trialFim: { lte: em3Dias } },
      orderBy: { trialFim: "asc" },
      select: { id: true, nome: true, whatsapp: true, trialFim: true },
    }),
  ]);

  const receitaMes = receitaAgg._sum.valor ?? 0;
  const baseRetencao = ativos + pausadosMes;
  const taxaRetencao = baseRetencao > 0 ? (ativos / baseRetencao) * 100 : 100;

  return {
    total,
    trial,
    ativos,
    pausados,
    interessadosAbertos,
    receitaMes,
    pausadosMes,
    taxaRetencao,
    trialsVencendo,
  };
}
