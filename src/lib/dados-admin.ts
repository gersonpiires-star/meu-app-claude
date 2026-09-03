import { prisma } from "@/lib/prisma";
import { limitesDoMes } from "@/lib/dados";
import { diaCivilBr } from "@/lib/format";

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

  // Previsto pro mês que vem: pega o último pagamento de assinatura
  // aprovado de cada assinante ativo e mensaliza (valor ÷ meses) — reflete
  // o preço real pago, não uma tabela fixa que pode ter mudado.
  const ativosComPagamento = await prisma.revendedor.findMany({
    where: { papel: "REVENDEDOR", statusAssinatura: "ATIVO" },
    select: {
      pagamentos: {
        where: { tipo: "ASSINATURA", status: "APROVADO" },
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { valor: true, meses: true },
      },
    },
  });

  let previstoMensal = 0;
  let previstoAnual = 0;
  let ativosSemPagamento = 0;
  for (const r of ativosComPagamento) {
    const pagamento = r.pagamentos[0];
    if (!pagamento) {
      ativosSemPagamento++;
      continue;
    }
    const meses = pagamento.meses ?? 1;
    const mensal = pagamento.valor / meses;
    if (meses <= 1) previstoMensal += mensal;
    else previstoAnual += mensal;
  }
  const previstoProxMes = previstoMensal + previstoAnual;
  const { ano: anoAgora, mes: mesAgora } = diaCivilBr(agora);
  const proximoMes = new Date(anoAgora, mesAgora + 1, 1);

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
    previstoProxMes,
    previstoMensal,
    previstoAnual,
    ativosSemPagamento,
    proximoMes,
  };
}
