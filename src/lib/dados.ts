import { prisma } from "@/lib/prisma";
import { PLANO_MESES, faixaVencimento } from "@/lib/planos";
import { ehAniversarioDeCasa } from "@/lib/aniversario";
import { saldoTotalCreditos } from "@/lib/plataformas";
import { inicioDoDiaBr } from "@/lib/format";

export function limitesDoMes(referencia: Date = new Date()) {
  const inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
  const fim = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1);
  return { inicio, fim };
}

// Estoque atual de um único produto — usado pra validar uma venda no
// servidor sem precisar buscar o estoque de todos os produtos.
export async function estoqueAtualProduto(produtoId: string): Promise<number> {
  const [entradas, saidas] = await Promise.all([
    prisma.movimentoEstoque.aggregate({ where: { produtoId, tipo: "ENTRADA" }, _sum: { quantidade: true } }),
    prisma.movimentoEstoque.aggregate({ where: { produtoId, tipo: "SAIDA" }, _sum: { quantidade: true } }),
  ]);
  return (entradas._sum.quantidade ?? 0) - (saidas._sum.quantidade ?? 0);
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

  // Interessados aparecem 3 dias antes do prazo de retorno marcado no
  // cadastro (e continuam aparecendo se já passou do prazo).
  const limiteRetornoLead = new Date(inicioDoDiaBr(agora));
  limiteRetornoLead.setDate(limiteRetornoLead.getDate() + 4);

  const [clientes, renovacoesMes, vendasMes, custosMedios, canceladosMes, creditos, leadsParaRetornar] = await Promise.all([
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
    saldoTotalCreditos(revendedorId),
    prisma.interessadoCliente.findMany({
      where: { revendedorId, convertido: false, retornarEm: { lt: limiteRetornoLead } },
      orderBy: { retornarEm: "asc" },
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

  const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const depoisDoProximoMes = new Date(agora.getFullYear(), agora.getMonth() + 2, 1);
  const venceProxMes = naoCancelados.filter((c) => c.vencimento >= proximoMes && c.vencimento < depoisDoProximoMes);
  const projReceitaProxMes = venceProxMes.reduce((a, c) => a + c.valorPlano, 0);
  const projCustoProxMes = venceProxMes.reduce(
    (a, c) => a + PLANO_MESES[c.plano] * (c.servico?.custoCredito ?? 0),
    0
  );
  const previstoProxMes = projReceitaProxMes - projCustoProxMes;

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
    ativos: naoCancelados.length,
    vencendo,
    vencidos,
    canceladosMes,
    taxaRetencao,
    aniversariantes,
    produtosBaixoEstoque,
    temClientes: clientes.length > 0,
    saldoCreditos: creditos.saldo,
    creditosBaixos: creditos.baixo,
    leadsParaRetornar,
  };
}
