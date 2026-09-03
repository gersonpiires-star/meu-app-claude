import { prisma } from "@/lib/prisma";
import { faixaVencimento } from "@/lib/planos";
import { ehAniversarioDeCasa } from "@/lib/aniversario";

export function limitesDoMes(referencia: Date = new Date()) {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1);
  return { inicio, fim };
}

export async function custoMedioProdutos(revendedorId: string) {
  const produtos = await prisma.produto.findMany({
    where: { revendedorId },
    include: { movimentos: true },
  });

  const mapa = new Map<string, { custoMedio: number; atual: number; entradas: number; vendido: number }>();
  for (const produto of produtos) {
    const entradas = produto.movimentos.filter((m) => m.tipo === "ENTRADA");
    const saidas = produto.movimentos.filter((m) => m.tipo === "SAIDA");
    const qtdEntrada = entradas.reduce((a, m) => a + m.quantidade, 0);
    const qtdSaida = saidas.reduce((a, m) => a + m.quantidade, 0);
    const custoTotal = entradas.reduce((a, m) => a + m.quantidade * m.custoUnitario, 0);
    mapa.set(produto.id, {
      custoMedio: qtdEntrada > 0 ? custoTotal / qtdEntrada : 0,
      atual: qtdEntrada - qtdSaida,
      entradas: qtdEntrada,
      vendido: qtdSaida,
    });
  }
  return mapa;
}

export async function dadosPainel(revendedorId: string) {
  const agora = new Date();
  const { inicio, fim } = limitesDoMes(agora);

  const [clientes, renovacoesMes, vendasMes, custosMedios, canceladosMes] = await Promise.all([
    prisma.cliente.findMany({
      where: { revendedorId },
      include: { servico: true },
      orderBy: { vencimento: "asc" },
    }),
    prisma.renovacao.findMany({
      where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } },
    }),
    prisma.venda.findMany({
      where: { revendedorId, data: { gte: inicio, lt: fim } },
      include: { produto: true },
    }),
    custoMedioProdutos(revendedorId),
    prisma.cliente.count({
      where: { revendedorId, status: "CANCELADO", motivoSaidaData: { gte: inicio, lt: fim } },
    }),
  ]);

  const receitaRecorrente = renovacoesMes.reduce((a, r) => a + r.valor, 0);
  const custoRecorrente = renovacoesMes.reduce((a, r) => a + r.custo, 0);
  const receitaApar = vendasMes.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);
  const custoApar = vendasMes.reduce((a, v) => {
    const custoMedio = custosMedios.get(v.produtoId)?.custoMedio ?? 0;
    return a + v.quantidade * custoMedio;
  }, 0);

  const receitaTotal = receitaRecorrente + receitaApar;
  const custoTotal = custoRecorrente + custoApar;
  const lucro = receitaTotal - custoTotal;

  const naoCancelados = clientes.filter((c) => c.status !== "CANCELADO");
  const vencendo = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "ATE_5_DIAS");
  const vencidos = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "VENCIDO");
  const ativos = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "EM_DIA");

  const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const previstoProxMes = naoCancelados.reduce((a, c) => a + c.valorPlano, 0);

  const produtosComEstoque = await prisma.produto.findMany({ where: { revendedorId } });
  const produtosBaixoEstoque = produtosComEstoque.filter((p) => {
    const info = custosMedios.get(p.id);
    return info && info.atual <= p.estoqueMinimo;
  });

  const baseRetencao = naoCancelados.length + canceladosMes;
  const taxaRetencao = baseRetencao > 0 ? (naoCancelados.length / baseRetencao) * 100 : 100;

  const aniversariantes = naoCancelados
    .map((c) => ({ cliente: c, ...ehAniversarioDeCasa(c.criadoEm, agora) }))
    .filter((a) => a.ehAniversario);

  return {
    receitaRecorrente,
    receitaApar,
    receitaTotal,
    custoTotal,
    lucro,
    proximoMes,
    previstoProxMes,
    totalClientes: naoCancelados.length,
    ativos: ativos.length,
    vencendo,
    vencidos,
    canceladosMes,
    taxaRetencao,
    aniversariantes,
    produtosBaixoEstoque,
    temClientes: clientes.length > 0,
  };
}
