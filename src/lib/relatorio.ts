import { prisma } from "@/lib/prisma";
import { diaCivilBr, brMidnightUTC } from "@/lib/format";
import { PLANO_MESES, PLANO_LABEL, faixaVencimento } from "@/lib/planos";

export async function ultimosMeses(revendedorId: string, quantidade = 6) {
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);
  const meses: { ano: number; mes: number; receita: number; custo: number; lucro: number }[] = [];

  for (let i = quantidade - 1; i >= 0; i--) {
    // Normaliza (ano, mes - i) pra virada de ano — essa conta é só
    // aritmética local (não vira instante comparado a nada), então tanto
    // faz o fuso do servidor aqui; os limites de busca é que precisam do
    // instante certo em Brasília, por isso usam brMidnightUTC abaixo.
    const referencia = new Date(agoraCivil.ano, agoraCivil.mes - i, 1);
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth();
    const inicio = brMidnightUTC(ano, mes, 1);
    const fim = brMidnightUTC(ano, mes + 1, 1);

    const [renovacoes, vendas] = await Promise.all([
      prisma.renovacao.findMany({ where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } } }),
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

    meses.push({ ano, mes, receita, custo, lucro: receita - custo });
  }

  return meses;
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
      where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } },
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

  const [porMes, clientesNovos, naoRenovaram, clientesAtivos] = await Promise.all([
    ultimosMeses(revendedorId, meses),
    prisma.cliente.count({ where: { revendedorId, criadoEm: { gte: inicioPeriodo, lt: fimPeriodo } } }),
    prisma.cliente.count({
      where: { revendedorId, status: "CANCELADO", motivoSaidaData: { gte: inicioPeriodo, lt: fimPeriodo } },
    }),
    prisma.cliente.findMany({
      where: { revendedorId, status: { not: "CANCELADO" } },
      select: { vencimento: true, valorPlano: true },
    }),
  ]);

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
    prisma.renovacao.findMany({ where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } } }),
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
