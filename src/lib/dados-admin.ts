import { prisma } from "@/lib/prisma";
import { limitesDoMes } from "@/lib/dados";
import { diaCivilBr, brMidnightUTC, inicioDoDiaBr } from "@/lib/format";
import { faixasDosUltimosMeses, serieAcumuladaDoMes } from "@/lib/meses";

export async function dadosAdmin() {
  const agora = new Date();
  const { inicio, fim } = limitesDoMes(agora);
  const em3Dias = new Date(agora.getTime() + 3 * 24 * 60 * 60000);

  const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60000);
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60000);
  const CATORZE_DIAS_MS = 14 * 24 * 60 * 60000;

  const [
    total,
    trial,
    ativos,
    pausados,
    interessadosAbertos,
    receitaAgg,
    pausadosMes,
    trialsVencendo,
    pagamentosRecusadosRaw,
    cuponsAtivos,
    ativosUltimos7Dias,
    ativosUltimos30Dias,
    semAcessoRecenteRaw,
  ] = await Promise.all([
    prisma.revendedor.count({ where: { papel: "REVENDEDOR" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "ATIVO" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "PAUSADO" } }),
    prisma.interessado.count({ where: { convertido: false } }),
    prisma.pagamento.aggregate({
      where: { tipo: "ASSINATURA", status: "APROVADO", atualizadoEm: { gte: inicio, lt: fim } },
      _sum: { valorLiquido: true, valor: true },
      _count: true,
    }),
    prisma.revendedor.count({
      where: { papel: "REVENDEDOR", statusAssinatura: "PAUSADO", pausadoEm: { gte: inicio, lt: fim } },
    }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL", trialFim: { lte: em3Dias } },
      orderBy: { trialFim: "asc" },
      select: { id: true, nome: true, whatsapp: true, trialFim: true },
    }),
    // Pagamento de assinatura recusado nos últimos 7 dias — hoje só vira um
    // push de resumo (contagem) pro admin, nunca fica listado em lugar
    // nenhum com nome/contato pra ele acompanhar quem precisa de ajuda pra
    // tentar de novo (dinheiro que já quase entrou e ficou parado).
    prisma.pagamento.findMany({
      where: { tipo: "ASSINATURA", status: "RECUSADO", atualizadoEm: { gte: seteDiasAtras } },
      orderBy: { atualizadoEm: "desc" },
      select: {
        id: true,
        valor: true,
        atualizadoEm: true,
        revendedor: { select: { id: true, nome: true, whatsapp: true, statusAssinatura: true } },
      },
    }),
    // Só cupom de campanha (uso geral) — cupom com revendedorId preenchido é
    // recompensa privada de indicação, não representa esforço de venda ativo.
    prisma.cupom.count({
      where: {
        ativo: true,
        revendedorId: null,
        OR: [{ validoAte: null }, { validoAte: { gte: agora } }],
      },
    }),
    prisma.revendedor.count({
      where: { papel: "REVENDEDOR", statusAssinatura: { not: "CANCELADO" }, ultimoAcessoEm: { gte: seteDiasAtras } },
    }),
    prisma.revendedor.count({
      where: { papel: "REVENDEDOR", statusAssinatura: { not: "CANCELADO" }, ultimoAcessoEm: { gte: trintaDiasAtras } },
    }),
    // Assinante pagante que não abre o app há um tempo — sinal mais direto
    // de "vai cancelar" que dá pra agir antes de acontecer (diferente de
    // assinantesEsfriando em dadosCrescimento, que só olha LogAtividade —
    // ações que gravam algo — e ignora quem só entra pra olhar o Painel).
    prisma.revendedor.findMany({
      where: {
        papel: "REVENDEDOR",
        statusAssinatura: "ATIVO",
        OR: [{ ultimoAcessoEm: null }, { ultimoAcessoEm: { lt: new Date(agora.getTime() - CATORZE_DIAS_MS) } }],
      },
      orderBy: { ultimoAcessoEm: { sort: "asc", nulls: "first" } },
      take: 10,
      select: { id: true, nome: true, whatsapp: true, ultimoAcessoEm: true },
    }),
  ]);

  const semAcessoRecente = semAcessoRecenteRaw.map((r) => ({
    ...r,
    diasSemAcesso: r.ultimoAcessoEm ? Math.floor((agora.getTime() - r.ultimoAcessoEm.getTime()) / 86400000) : null,
  }));

  // Um revendedor pode ter mais de uma tentativa recusada na janela — só a
  // mais recente interessa pra lista, e ignora quem já resolveu (voltou a
  // ficar ATIVO por outro meio, ex: pagou por Pix manual).
  const pagamentosRecusadosPorRevendedor = new Map<string, (typeof pagamentosRecusadosRaw)[number]>();
  for (const p of pagamentosRecusadosRaw) {
    if (p.revendedor.statusAssinatura === "ATIVO") continue;
    if (!pagamentosRecusadosPorRevendedor.has(p.revendedor.id)) {
      pagamentosRecusadosPorRevendedor.set(p.revendedor.id, p);
    }
  }
  const pagamentosRecusados = [...pagamentosRecusadosPorRevendedor.values()];

  const receitaMes = receitaAgg._sum.valorLiquido ?? 0;
  const receitaBrutaMes = receitaAgg._sum.valor ?? 0;
  const taxaMpMes = receitaBrutaMes - receitaMes;
  const pagamentosMes = receitaAgg._count;
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
        select: { valor: true, valorLiquido: true, meses: true },
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
    const mensal = (pagamento.valorLiquido ?? pagamento.valor) / meses;
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
    receitaBrutaMes,
    taxaMpMes,
    pagamentosMes,
    pausadosMes,
    ativosUltimos7Dias,
    ativosUltimos30Dias,
    semAcessoRecente,
    taxaRetencao,
    trialsVencendo,
    pagamentosRecusados,
    cuponsAtivos,
    previstoProxMes,
    previstoMensal,
    previstoSemestral,
    previstoAnual,
    ativosSemPagamento,
    proximoMes,
  };
}

// Receita de assinaturas mês a mês (últimos `quantidade` meses) — mesmo
// padrão de ultimosMeses() em lib/relatorio.ts, só que somando Pagamento
// (a plataforma cobrando os revendedores) em vez de Renovacao/Venda (o
// revendedor cobrando os clientes dele). Alimenta o gráfico "Receita por
// mês" no Painel do administrador.
export async function receitaMensalAdmin(quantidade = 6) {
  // Um mês não depende do resultado de outro — roda todos em paralelo em vez
  // de um for..await sequencial (mesmo ajuste feito em ultimosMeses(), que
  // tinha o mesmo padrão pro lado do revendedor).
  return Promise.all(
    faixasDosUltimosMeses(quantidade).map(async ({ ano, mes, inicio, fim }) => {
      const agg = await prisma.pagamento.aggregate({
        where: { tipo: "ASSINATURA", status: "APROVADO", atualizadoEm: { gte: inicio, lt: fim } },
        _sum: { valorLiquido: true },
      });
      return { ano, mes, receita: agg._sum.valorLiquido ?? 0 };
    })
  );
}

// Receita de assinaturas acumulada dia a dia no mês atual (até hoje) e no
// mês anterior — mesmo padrão de serieReceitaMes() em lib/dados.ts, só que
// somando Pagamento (a plataforma cobrando os revendedores) em vez de
// Renovacao/Venda. Alimenta o minigráfico "Entrou em {mês}" do Painel do
// administrador.
export async function serieReceitaMesAdmin(agora: Date = new Date()) {
  const { ano, mes } = diaCivilBr(agora);
  const inicioAnterior = brMidnightUTC(ano, mes - 1, 1);
  const { fim } = limitesDoMes(agora);

  const pagamentos = await prisma.pagamento.findMany({
    where: { tipo: "ASSINATURA", status: "APROVADO", atualizadoEm: { gte: inicioAnterior, lt: fim } },
    select: { valorLiquido: true, valor: true, atualizadoEm: true },
  });

  return serieAcumuladaDoMes(
    pagamentos.map((p) => ({ data: p.atualizadoEm, valor: p.valorLiquido ?? p.valor })),
    agora
  );
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

  // "Ativação" = cadastrou pelo menos 1 cliente de verdade — o passo do
  // meio do funil entre criar o trial e virar pagante. _count.clientes já
  // vem na mesma query de revendedores (sem custo extra de consulta).
  const ativados = revendedores.filter((r) => r._count.clientes > 0).length;
  const taxaAtivacao = totalRevendedores > 0 ? (ativados / totalRevendedores) * 100 : 0;
  const taxaAtivacaoParaPago = ativados > 0 ? (convertidos / ativados) * 100 : 0;

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

  // Assinante ativo que sumiu — sem nenhuma ação registrada (LogAtividade
  // cobre praticamente tudo que o dono/funcionário faz no app: cadastrar
  // cliente, cobrar, vender aparelho etc.) há mais que o limiar. É o mesmo
  // sinal de "trial quente" só que pro lado oposto: quem parou de usar
  // tende a cancelar depois, então dá pra tentar reengajar antes.
  const LIMIAR_DIAS_ESFRIANDO = 10;
  const idsAtivos = revendedores.filter((r) => r.statusAssinatura === "ATIVO").map((r) => r.id);
  const ultimasAtividades =
    idsAtivos.length > 0
      ? await prisma.logAtividade.groupBy({
          by: ["revendedorId"],
          where: { revendedorId: { in: idsAtivos } },
          _max: { criadoEm: true },
        })
      : [];
  const ultimaAtividadePorId = new Map(ultimasAtividades.map((a) => [a.revendedorId, a._max.criadoEm]));

  const assinantesEsfriando = revendedores
    .filter((r) => r.statusAssinatura === "ATIVO")
    .map((r) => {
      const ultimaAtividade = ultimaAtividadePorId.get(r.id) ?? null;
      // Sem nenhuma atividade registrada, a referência é a conversão em
      // pagante (não o cadastro/trial) — senão quem virou assinante há
      // pouco, mas nunca logou depois de pagar, já nasce "esfriando" contado
      // desde o trial, mesmo tendo acabado de converter.
      const referencia = ultimaAtividade ?? primeiraConversao.get(r.id) ?? r.criadoEm;
      const diasSemAtividade = Math.floor((agora.getTime() - referencia.getTime()) / 86400000);
      return { id: r.id, nome: r.nome, whatsapp: r.whatsapp, diasSemAtividade, nuncaTeveAtividade: !ultimaAtividade };
    })
    .filter((r) => r.diasSemAtividade >= LIMIAR_DIAS_ESFRIANDO)
    .sort((a, b) => b.diasSemAtividade - a.diasSemAtividade)
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
    ativados,
    taxaAtivacao,
    taxaAtivacaoParaPago,
    convertidos,
    taxaConversaoTrial,
    diaMedioConversao,
    histogramaDias,
    trialsEngajados,
    trialsVencidosSemConverter,
    assinantesEsfriando,
    coorte,
    cancelamentosRecentes,
  };
}

function variacaoPct(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null;
  return ((atual - anterior) / anterior) * 100;
}

// Métricas de plataforma inteira (todos os revendedores somados) pro
// Dashboard administrativo: novos usuários (revendedores) e clientes finais
// deles num período (7/30/90 dias), com série dia a dia dos sinais de conta
// pro gráfico. Tudo vem de contagem real (criadoEm) — nada aqui é estimado
// nem interpolado; sem assinantes/clientes suficientes no período, as séries
// e variações saem zeradas/nulas de propósito, pra tela mostrar estado vazio
// em vez de inventar tendência.
export async function metricasPlataforma(dias: 7 | 30 | 90) {
  const agora = new Date();
  const hojeCivil = inicioDoDiaBr(agora);
  const UM_DIA_MS = 24 * 60 * 60000;
  const inicio = new Date(hojeCivil.getTime() - (dias - 1) * UM_DIA_MS);
  const inicioAnterior = new Date(inicio.getTime() - dias * UM_DIA_MS);

  const [
    novosRevendedores,
    revendedoresPeriodoAnterior,
    totalClientesPlataforma,
    clientesAtivosPlataforma,
    novosClientesPlataforma,
    novosClientesPeriodoAnterior,
    revendedoresNoPeriodo,
  ] = await Promise.all([
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", criadoEm: { gte: inicio } } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", criadoEm: { gte: inicioAnterior, lt: inicio } } }),
    prisma.cliente.count(),
    prisma.cliente.count({ where: { status: { not: "CANCELADO" } } }),
    prisma.cliente.count({ where: { criadoEm: { gte: inicio } } }),
    prisma.cliente.count({ where: { criadoEm: { gte: inicioAnterior, lt: inicio } } }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR", criadoEm: { gte: inicio } },
      select: { criadoEm: true },
    }),
  ]);

  // Agrupa os cadastros do período por dia civil (Brasília) — mesma lógica
  // de "nunca usar getFullYear/getMonth/getDate direto" do resto do app.
  const buckets = new Map<string, number>();
  for (let i = 0; i < dias; i++) {
    const dia = new Date(hojeCivil.getTime() - (dias - 1 - i) * UM_DIA_MS);
    buckets.set(dia.toISOString().slice(0, 10), 0);
  }
  for (const r of revendedoresNoPeriodo) {
    const chave = inicioDoDiaBr(r.criadoEm).toISOString().slice(0, 10);
    if (buckets.has(chave)) buckets.set(chave, (buckets.get(chave) ?? 0) + 1);
  }
  const serieNovosUsuarios = [...buckets.entries()].map(([data, quantidade]) => ({ data, quantidade }));

  return {
    dias,
    novosRevendedores,
    variacaoRevendedores: variacaoPct(novosRevendedores, revendedoresPeriodoAnterior),
    totalClientesPlataforma,
    clientesAtivosPlataforma,
    clientesInativosPlataforma: totalClientesPlataforma - clientesAtivosPlataforma,
    novosClientesPlataforma,
    variacaoClientes: variacaoPct(novosClientesPlataforma, novosClientesPeriodoAnterior),
    serieNovosUsuarios,
  };
}
