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
  let previstoSemestral = 0;
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
    else if (meses < 12) previstoSemestral += mensal;
    else previstoAnual += mensal;
  }
  const previstoProxMes = previstoMensal + previstoSemestral + previstoAnual;
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
    previstoSemestral,
    previstoAnual,
    ativosSemPagamento,
    proximoMes,
  };
}

// Funil de vendas do próprio GestorPro (leads → trial → pago), quem são os
// trials mais engajados (uso real, não só tempo restante), e a coorte de
// retenção de quem virou pagante — tudo pra ajudar a vender/reter melhor,
// não pra operar o dia a dia dos assinantes (isso já é dadosAdmin).
export async function dadosCrescimento() {
  const [totalInteressados, interessadosConvertidos, revendedores, pagamentosAprovados, cancelamentosRecentes] = await Promise.all([
    prisma.interessado.count(),
    prisma.interessado.count({ where: { convertido: true } }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR" },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        criadoEm: true,
        statusAssinatura: true,
        trialFim: true,
        _count: { select: { clientes: true, vendas: true } },
      },
    }),
    prisma.pagamento.findMany({
      where: { tipo: "ASSINATURA", status: "APROVADO" },
      select: { revendedorId: true, atualizadoEm: true },
      orderBy: { atualizadoEm: "asc" },
    }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR", statusAssinatura: "CANCELADO" },
      orderBy: { canceladoEm: "desc" },
      take: 8,
      select: { id: true, nome: true, motivoCancelamento: true, canceladoEm: true },
    }),
  ]);

  const taxaConversaoInteressados = totalInteressados > 0 ? (interessadosConvertidos / totalInteressados) * 100 : 0;

  // Primeiro pagamento de assinatura aprovado de cada revendedor = quando
  // ele virou pagante (a lista já vem ordenada por atualizadoEm asc).
  const primeiraConversao = new Map<string, Date>();
  for (const p of pagamentosAprovados) {
    if (!primeiraConversao.has(p.revendedorId)) primeiraConversao.set(p.revendedorId, p.atualizadoEm);
  }

  const totalRevendedores = revendedores.length;
  const convertidos = primeiraConversao.size;
  const taxaConversaoTrial = totalRevendedores > 0 ? (convertidos / totalRevendedores) * 100 : 0;

  const diasParaConverter: number[] = [];
  const histogramaMap = new Map<number, number>();
  for (const r of revendedores) {
    const dataConversao = primeiraConversao.get(r.id);
    if (!dataConversao) continue;
    const dias = Math.max(0, Math.round((dataConversao.getTime() - r.criadoEm.getTime()) / 86400000));
    diasParaConverter.push(dias);
    const bucket = Math.min(dias, 7);
    histogramaMap.set(bucket, (histogramaMap.get(bucket) ?? 0) + 1);
  }
  const diaMedioConversao =
    diasParaConverter.length > 0 ? diasParaConverter.reduce((a, b) => a + b, 0) / diasParaConverter.length : null;
  const histogramaDias = Array.from({ length: 8 }, (_, dia) => ({ dia, quantidade: histogramaMap.get(dia) ?? 0 }));

  const agora = new Date();
  const trialsEngajados = revendedores
    .filter((r) => r.statusAssinatura === "TRIAL" && r.trialFim > agora && (r._count.clientes > 0 || r._count.vendas > 0))
    .sort((a, b) => b._count.clientes + b._count.vendas - (a._count.clientes + a._count.vendas))
    .slice(0, 10);

  // Trial que venceu e nunca converteu (nenhum pagamento de assinatura
  // aprovado) — mesma situação de um "interessado" que esfriou: dá pra
  // tentar reconquistar com uma mensagem de renovação.
  const trialsVencidosSemConverter = revendedores
    .filter((r) => r.statusAssinatura === "TRIAL" && r.trialFim <= agora && !primeiraConversao.has(r.id))
    .sort((a, b) => b.trialFim.getTime() - a.trialFim.getTime())
    .slice(0, 10);

  const cohortMap = new Map<string, { ano: number; mes: number; total: number; aindaAtivos: number }>();
  for (const r of revendedores) {
    const dataConversao = primeiraConversao.get(r.id);
    if (!dataConversao) continue;
    const { ano, mes } = diaCivilBr(dataConversao);
    const chave = `${ano}-${mes}`;
    const atual = cohortMap.get(chave) ?? { ano, mes, total: 0, aindaAtivos: 0 };
    atual.total += 1;
    if (r.statusAssinatura === "ATIVO") atual.aindaAtivos += 1;
    cohortMap.set(chave, atual);
  }
  const coorte = [...cohortMap.values()]
    .sort((a, b) => b.ano - a.ano || b.mes - a.mes)
    .slice(0, 12)
    .map((c) => ({ ...c, retencaoPct: c.total > 0 ? (c.aindaAtivos / c.total) * 100 : 0 }));

  return {
    totalInteressados,
    interessadosConvertidos,
    taxaConversaoInteressados,
    totalRevendedores,
    convertidos,
    taxaConversaoTrial,
    diaMedioConversao,
    histogramaDias,
    trialsEngajados,
    trialsVencidosSemConverter,
    coorte,
    cancelamentosRecentes,
  };
}
