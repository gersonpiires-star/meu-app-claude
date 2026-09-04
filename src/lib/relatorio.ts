import { prisma } from "@/lib/prisma";
import { custoMedioProdutos } from "@/lib/dados";
import { diaCivilBr, brMidnightUTC } from "@/lib/format";
import { PLANO_MESES } from "@/lib/planos";

export async function ultimosMeses(revendedorId: string, quantidade = 6) {
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);
  const meses: { ano: number; mes: number; receita: number; custo: number; lucro: number }[] = [];

  const custos = await custoMedioProdutos(revendedorId);

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
    const custoVendas = vendas.reduce((a, v) => a + v.quantidade * (custos.get(v.produtoId)?.custoMedio ?? 0), 0);

    const receita = receitaRenov + receitaVendas;
    const custo = custoRenov + custoVendas;

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
  const custos = await custoMedioProdutos(revendedorId);

  const [renovacoes, vendas, cancelados] = await Promise.all([
    prisma.renovacao.findMany({
      where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } },
      include: { cliente: { include: { servico: true } } },
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
  const custoVendas = vendas.reduce((a, v) => a + v.quantidade * (custos.get(v.produtoId)?.custoMedio ?? 0), 0);

  const receita = receitaRenov + receitaVendas;
  const custo = custoRenov + custoVendas;
  const lucro = receita - custo;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;

  const vendasComCusto = vendas.map((v) => {
    const custoMedio = custos.get(v.produtoId)?.custoMedio ?? 0;
    const bruto = v.quantidade * v.valorUnitario;
    const taxa = bruto * (v.taxaPercentual / 100);
    const custoTotal = v.quantidade * custoMedio;
    const liquido = bruto - taxa - custoTotal;
    return { ...v, custoUnitario: custoMedio, custoTotal, taxa, liquido };
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
