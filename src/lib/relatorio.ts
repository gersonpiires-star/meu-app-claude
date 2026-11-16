import { prisma } from "@/lib/prisma";
import { diaCivilBr, brMidnightUTC } from "@/lib/format";
import { faixasDosUltimosMeses } from "@/lib/meses";
import { PLANO_MESES, PLANO_LABEL, faixaVencimento } from "@/lib/planos";
import { faixaPontualidade } from "@/lib/pontualidade";

export async function ultimosMeses(revendedorId: string, quantidade = 6) {
  // Um mês não depende do resultado de outro — roda todos em paralelo em vez
  // de um for..await sequencial (que pra período de 12 meses virava até 24
  // round-trips um atrás do outro).
  return Promise.all(
    faixasDosUltimosMeses(quantidade).map(async ({ ano, mes, inicio, fim }) => {
      const [renovacoes, vendas] = await Promise.all([
        prisma.renovacao.findMany({ where: { revendedorId, data: { gte: inicio, lt: fim } } }),
        prisma.venda.findMany({ where: { revendedorId, data: { gte: inicio, lt: fim } } }),
      ]);

      const receitaRenov = renovacoes.reduce((a, r) => a + r.valor, 0);
      const custoRenov = renovacoes.reduce((a, r) => a + r.custo, 0);
      const receitaVendas = vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);
      const custoVendas = vendas.reduce((a, v) => a + v.quantidade * v.custoUnitario, 0);
      // Taxa da maquininha (cartão) também sai do bolso — ver comentário em
      // dadosMes, abaixo, sobre esse mesmo desconto.
      const taxaVendas = vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario * (v.taxaPercentual / 100), 0);

      const receita = receitaRenov + receitaVendas;
      const custo = custoRenov + custoVendas + taxaVendas;

      return { ano, mes, receita, custo, lucro: receita - custo };
    })
  );
}

export async function dadosMes(revendedorId: string, ano: number, mes: number) {
  // Nunca `new Date(ano, mes, 1)` aqui: isso monta meia-noite no fuso do
  // servidor (UTC em produção), que caindo de volta em Brasília é 21h do
  // dia anterior — um "mês 1" vira o mês anterior inteiro na busca abaixo.
  // brMidnightUTC monta o instante certo direto, sem passar por essa volta.
  const inicio = brMidnightUTC(ano, mes, 1);
  const fim = brMidnightUTC(ano, mes + 1, 1);

  const [renovacoes, vendas, cancelados] = await Promise.all([
    prisma.renovacao.findMany({
      where: { revendedorId, data: { gte: inicio, lt: fim } },
      include: { cliente: true, servico: true },
      orderBy: { data: "desc" },
    }),
    prisma.venda.findMany({
      where: { revendedorId, data: { gte: inicio, lt: fim } },
      include: { produto: true, cliente: true },
    }),
    prisma.cliente.findMany({
      where: { revendedorId, status: "CANCELADO", motivoSaidaData: { gte: inicio, lt: fim } },
    }),
  ]);

  const receitaRenov = renovacoes.reduce((a, r) => a + r.valor, 0);
  const custoRenov = renovacoes.reduce((a, r) => a + r.custo, 0);
  const receitaVendas = vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);
  const custoVendas = vendas.reduce((a, v) => a + v.quantidade * v.custoUnitario, 0);
  // Taxa da maquininha (cartão) também sai do bolso — sem descontar aqui,
  // "Lucro do mês"/"Margem" (abaixo) ficavam maiores do que a soma dos
  // "líquido" de cada venda mostrados logo depois na mesma tela, que já
  // descontam essa taxa (ver `liquido` em vendasComCusto).
  const taxaVendas = vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario * (v.taxaPercentual / 100), 0);

  const receita = receitaRenov + receitaVendas;
  const custo = custoRenov + custoVendas + taxaVendas;
  const lucro = receita - custo;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  const vendasComCusto = vendas.map((v) => {
    const bruto = v.quantidade * v.valorUnitario;
    const taxa = bruto * (v.taxaPercentual / 100);
    const custoTotal = v.quantidade * v.custoUnitario;
    const liquido = bruto - taxa - custoTotal;
    return { ...v, custoTotal, taxa, liquido };
  });

  return {
    receita,
    custo,
    lucro,
    margem,
    custoRenov,
    custoVendas,
    renovacoes,
    vendas: vendasComCusto,
    cancelados,
  };
}

export async function proximoMes(revendedorId: string) {
  const agora = new Date();
  const { ano, mes } = diaCivilBr(agora);
  const proximo = brMidnightUTC(ano, mes + 1, 1);
  const depois = brMidnightUTC(ano, mes + 2, 1);

  const vencendo = await prisma.cliente.findMany({
    where: { revendedorId, status: { not: "CANCELADO" }, vencimento: { gte: proximo, lt: depois } },
    include: { servico: true },
  });

  // "Lucro previsto" precisa descontar o custo — a mesma conta que
  // dadosPainel() já faz pro card do Painel. Sem isso, esse card mostrava a
  // receita bruta com o rótulo de lucro, e os dois números nunca batiam.
  const previsto = vencendo.reduce((a, c) => {
    const custo = PLANO_MESES[c.plano] * (c.servico?.custoCredito ?? 0);
    return a + (c.valorPlano - custo);
  }, 0);

  return {
    referencia: proximo,
    quantidade: vencendo.length,
    previsto,
  };
}

// Visão geral por período (30 dias/6 meses/12 meses) — resumo de negócio pra
// comparar o momento atual com o passado, sem precisar navegar mês a mês.
// "30 dias" aqui é aproximado pelo último 1 mês corrido (mesma granularidade
// mensal de ultimosMeses), não uma janela rolante dia a dia.
export async function visaoGeralPeriodo(revendedorId: string, meses: number) {
  const agora = new Date();
  const { ano, mes } = diaCivilBr(agora);
  const inicioPeriodo = brMidnightUTC(ano, mes - (meses - 1), 1);
  const fimPeriodo = brMidnightUTC(ano, mes + 1, 1);

  // Busca sempre pelo menos 6 meses de uma vez só (nunca menos do que o
  // gráfico "últimos 6 meses" da página de relatório precisa) — assim quem
  // chama essa função com o período de 6 meses (o padrão da tela) reaproveita
  // a mesma busca pros dois lugares, em vez de rodar ultimosMeses() duas
  // vezes com o mesmo resultado.
  const quantidadeBuscada = Math.max(6, meses);
  const [porMesBuscado, clientesNovos, naoRenovaram, clientesAtivos] = await Promise.all([
    ultimosMeses(revendedorId, quantidadeBuscada),
    prisma.cliente.count({ where: { revendedorId, criadoEm: { gte: inicioPeriodo, lt: fimPeriodo } } }),
    prisma.cliente.count({
      where: { revendedorId, status: "CANCELADO", motivoSaidaData: { gte: inicioPeriodo, lt: fimPeriodo } },
    }),
    prisma.cliente.findMany({
      where: { revendedorId, status: { not: "CANCELADO" } },
      select: { vencimento: true, valorPlano: true },
    }),
  ]);

  const porMes = porMesBuscado.slice(-meses);
  const porMesGrafico = porMesBuscado.slice(-6);

  const receita = porMes.reduce((a, m) => a + m.receita, 0);
  const custo = porMes.reduce((a, m) => a + m.custo, 0);
  const lucro = receita - custo;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  const primeiraMetade = porMes.slice(0, Math.max(1, Math.floor(porMes.length / 2))).reduce((a, m) => a + m.receita, 0);
  const segundaMetade = porMes.slice(Math.floor(porMes.length / 2)).reduce((a, m) => a + m.receita, 0);
  const variacaoPct = primeiraMetade > 0 ? ((segundaMetade - primeiraMetade) / primeiraMetade) * 100 : 0;

  let vencidos = 0;
  let vencendo = 0;
  let valorVencidos = 0;
  for (const c of clientesAtivos) {
    const faixa = faixaVencimento(c.vencimento);
    if (faixa === "VENCIDO") {
      vencidos += 1;
      valorVencidos += c.valorPlano;
    } else if (faixa === "ATE_5_DIAS") vencendo += 1;
  }
  const ativos = clientesAtivos.length;
  const emDia = Math.max(0, ativos - vencidos - vencendo);
  const totalCarteira = ativos + naoRenovaram;
  // Retenção aqui é "da carteira atual, quantos estão em dia" (emDia/ativos)
  // — não envolve quem já cancelou, esse é o papel de taxaPerdaPct abaixo.
  const retencaoPct = ativos > 0 ? (emDia / ativos) * 100 : 0;
  // "Se os vencidos renovarem": projeção otimista pra motivar a cobrança —
  // não conta quem tá só vencendo (ainda não perdeu o prazo).
  const carteiraProjetada = emDia + vencidos;
  const pctProjetada = ativos > 0 ? (carteiraProjetada / ativos) * 100 : 0;

  return {
    porMes,
    porMesGrafico,
    receita,
    lucro,
    margem,
    variacaoPct,
    clientesNovos,
    naoRenovaram,
    taxaPerdaPct: totalCarteira > 0 ? (naoRenovaram / totalCarteira) * 100 : 0,
    ativos,
    emDia,
    vencendo,
    vencidos,
    retencaoPct,
    carteiraProjetada,
    pctProjetada,
    valorVencidos,
  };
}

// Agrupa renovações (por plano) e vendas (por produto) do período — pra
// tabela "O que mais vende", ranqueada por receita.
export async function oQueMaisVendeNoPeriodo(revendedorId: string, meses: number) {
  const agora = new Date();
  const { ano, mes } = diaCivilBr(agora);
  const inicio = brMidnightUTC(ano, mes - (meses - 1), 1);
  const fim = brMidnightUTC(ano, mes + 1, 1);

  const [renovacoes, vendas] = await Promise.all([
    prisma.renovacao.findMany({ where: { revendedorId, data: { gte: inicio, lt: fim } } }),
    prisma.venda.findMany({ where: { revendedorId, data: { gte: inicio, lt: fim } }, include: { produto: true } }),
  ]);

  const grupos = new Map<string, { nome: string; vendas: number; receita: number; lucro: number }>();
  for (const r of renovacoes) {
    const chave = `plano-${r.plano}`;
    const nome = `Renovação ${PLANO_LABEL[r.plano]}`;
    const atual = grupos.get(chave) ?? { nome, vendas: 0, receita: 0, lucro: 0 };
    atual.vendas += 1;
    atual.receita += r.valor;
    atual.lucro += r.valor - r.custo;
    grupos.set(chave, atual);
  }
  for (const v of vendas) {
    const chave = `produto-${v.produtoId}`;
    const bruto = v.quantidade * v.valorUnitario;
    const taxa = bruto * (v.taxaPercentual / 100);
    const atual = grupos.get(chave) ?? { nome: v.produto.modelo, vendas: 0, receita: 0, lucro: 0 };
    atual.vendas += v.quantidade;
    atual.receita += bruto;
    atual.lucro += bruto - taxa - v.quantidade * v.custoUnitario;
    grupos.set(chave, atual);
  }

  return [...grupos.values()].sort((a, b) => b.receita - a.receita);
}

// Resumo dos últimos 7 dias corridos (janela rolante, não calendário) —
// alimenta o e-mail de relatório semanal (api/cron/lembrete-diario). Mesmo
// cuidado de fuso dos outros relatórios: "fim" é o fim do dia civil de hoje
// em Brasília (brMidnightUTC do dia seguinte), nunca `agora` bruto, senão a
// janela de 7 dias cortava umas horas do dia de hoje em produção (UTC).
export async function resumoUltimos7Dias(revendedorId: string, agora: Date = new Date()) {
  const hojeCivil = diaCivilBr(agora);
  const fim = brMidnightUTC(hojeCivil.ano, hojeCivil.mes, hojeCivil.dia + 1);
  const inicio = new Date(fim.getTime() - 7 * 24 * 60 * 60000);

  const [renovacoes, vendas, clientesNovos, cancelados, clientesAtivos] = await Promise.all([
    prisma.renovacao.findMany({ where: { revendedorId, data: { gte: inicio, lt: fim } } }),
    prisma.venda.findMany({ where: { revendedorId, data: { gte: inicio, lt: fim } } }),
    prisma.cliente.count({ where: { revendedorId, criadoEm: { gte: inicio, lt: fim } } }),
    prisma.cliente.count({ where: { revendedorId, status: "CANCELADO", motivoSaidaData: { gte: inicio, lt: fim } } }),
    prisma.cliente.findMany({ where: { revendedorId, status: { not: "CANCELADO" } }, select: { vencimento: true } }),
  ]);

  const receitaRenov = renovacoes.reduce((a, r) => a + r.valor, 0);
  const custoRenov = renovacoes.reduce((a, r) => a + r.custo, 0);
  const receitaVendas = vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);
  const custoVendas = vendas.reduce((a, v) => a + v.quantidade * v.custoUnitario, 0);
  const taxaVendas = vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario * (v.taxaPercentual / 100), 0);

  const receita = receitaRenov + receitaVendas;
  const custo = custoRenov + custoVendas + taxaVendas;

  let vencidos = 0;
  let vencendo = 0;
  for (const c of clientesAtivos) {
    const faixa = faixaVencimento(c.vencimento, agora);
    if (faixa === "VENCIDO") vencidos += 1;
    else if (faixa === "ATE_5_DIAS") vencendo += 1;
  }

  return {
    inicio,
    fim,
    receita,
    custo,
    lucro: receita - custo,
    renovacoes: renovacoes.length,
    vendas: vendas.length,
    clientesNovos,
    cancelados,
    ativos: clientesAtivos.length,
    vencidos,
    vencendo,
  };
}

// Métricas que hoje não apareciam em nenhuma tela, apesar do dado já
// existir: LTV médio da carteira (cada cliente já tem o próprio total —
// ver clientes/[id]/page.tsx — nunca somado), pontualidade agregada (idem,
// faixaPontualidade já existe por cliente), % de clientes que vieram de
// indicação de outro cliente, e lucro por app (hoje só existe por
// produto/plano em oQueMaisVendeNoPeriodo).
export async function metricasCarteira(revendedorId: string) {
  const [clientes, renovacoes, vendas, servicos] = await Promise.all([
    prisma.cliente.findMany({
      where: { revendedorId, status: { not: "CANCELADO" } },
      select: { id: true, indicadoPorId: true, _count: { select: { cobrancas: true, renovacoes: true } } },
    }),
    prisma.renovacao.findMany({ where: { revendedorId }, select: { clienteId: true, valor: true, custo: true, servicoId: true } }),
    prisma.venda.findMany({ where: { revendedorId, clienteId: { not: null } }, select: { clienteId: true, quantidade: true, valorUnitario: true } }),
    prisma.servico.findMany({ where: { revendedorId }, select: { id: true, nome: true } }),
  ]);
  const nomeServico = new Map(servicos.map((s) => [s.id, s.nome]));

  const ltvPorCliente = new Map<string, number>();
  for (const r of renovacoes) ltvPorCliente.set(r.clienteId, (ltvPorCliente.get(r.clienteId) ?? 0) + r.valor);
  for (const v of vendas) {
    if (!v.clienteId) continue;
    ltvPorCliente.set(v.clienteId, (ltvPorCliente.get(v.clienteId) ?? 0) + v.quantidade * v.valorUnitario);
  }
  const valoresLtv = [...ltvPorCliente.values()];
  const ltvMedio = valoresLtv.length > 0 ? valoresLtv.reduce((a, b) => a + b, 0) / valoresLtv.length : 0;

  const contagemPontualidade = new Map<string, number>();
  for (const c of clientes) {
    const { label } = faixaPontualidade(c._count.cobrancas, c._count.renovacoes);
    contagemPontualidade.set(label, (contagemPontualidade.get(label) ?? 0) + 1);
  }

  const comIndicacao = clientes.filter((c) => c.indicadoPorId).length;
  const pctIndicacao = clientes.length > 0 ? (comIndicacao / clientes.length) * 100 : 0;

  const lucroPorApp = new Map<string, { nome: string; receita: number; lucro: number }>();
  for (const r of renovacoes) {
    const nome = r.servicoId ? nomeServico.get(r.servicoId) ?? "App removido" : "Sem app definido";
    const atual = lucroPorApp.get(nome) ?? { nome, receita: 0, lucro: 0 };
    atual.receita += r.valor;
    atual.lucro += r.valor - r.custo;
    lucroPorApp.set(nome, atual);
  }

  return {
    ltvMedio,
    clientesComLtv: valoresLtv.length,
    pontualidade: [...contagemPontualidade.entries()].map(([label, quantidade]) => ({ label, quantidade })),
    totalAtivos: clientes.length,
    comIndicacao,
    pctIndicacao,
    porApp: [...lucroPorApp.values()].sort((a, b) => b.lucro - a.lucro),
  };
}
