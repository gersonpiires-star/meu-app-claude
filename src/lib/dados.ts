import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PLANO_MESES, faixaVencimento } from "@/lib/planos";
import { ehAniversarioDeCasa } from "@/lib/aniversario";
import { saldoTotalCreditos } from "@/lib/plataformas";
import { diaCivilBr, inicioDoDiaBr, brMidnightUTC } from "@/lib/format";

export function limitesDoMes(referencia: Date = new Date()) {
  const { ano, mes } = diaCivilBr(referencia);
  const inicio = brMidnightUTC(ano, mes, 1);
  const fim = brMidnightUTC(ano, mes + 1, 1);
  return { inicio, fim };
}

// Estoque atual de um único produto — usado pra validar uma venda no
// servidor sem precisar buscar o estoque de todos os produtos. Aceita um
// client de transação opcional pra poder checar e gravar a venda no mesmo
// snapshot (ver registrarVenda em vendas/actions.ts) — sem isso, duas vendas
// simultâneas do mesmo produto podiam ambas passar na checagem e deixar o
// estoque negativo.
export async function estoqueAtualProduto(
  produtoId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  const [entradas, saidas] = await Promise.all([
    db.movimentoEstoque.aggregate({ where: { produtoId, tipo: "ENTRADA" }, _sum: { quantidade: true } }),
    db.movimentoEstoque.aggregate({ where: { produtoId, tipo: "SAIDA" }, _sum: { quantidade: true } }),
  ]);
  return (entradas._sum.quantidade ?? 0) - (saidas._sum.quantidade ?? 0);
}

export type Lote = { restante: number; custoUnitario: number };
type MovimentoOrdenavel = { tipo: "ENTRADA" | "SAIDA"; quantidade: number; custoUnitario: number; data: Date; id: string };

// Consome a fila de lotes (mais antigo primeiro) — usado tanto pra "andar" o
// histórico até agora (deixando só os lotes ainda não vendidos) quanto pra
// descobrir o custo real de uma venda nova, sem duplicar a lógica de FIFO.
// Exportado porque a importação do app antigo (importar-actions.ts) também
// precisa simular o consumo em memória ao gerar vendas em lote.
export function consumirFifo(fila: Lote[], quantidade: number): number {
  let falta = quantidade;
  let custoTotal = 0;
  while (falta > 0 && fila.length > 0) {
    const lote = fila[0];
    const consumido = Math.min(lote.restante, falta);
    custoTotal += consumido * lote.custoUnitario;
    lote.restante -= consumido;
    falta -= consumido;
    if (lote.restante <= 0) fila.shift();
  }
  return custoTotal;
}

// Reconstrói quais lotes de compra ainda não foram totalmente vendidos,
// andando o histórico de movimentos em ordem cronológica e descontando cada
// saída dos lotes mais antigos primeiro (FIFO) — a mesma ordem em que as
// compras de fato vão sendo consumidas.
function lotesAbertos(movimentos: MovimentoOrdenavel[]): Lote[] {
  const ordenados = [...movimentos].sort((a, b) => a.data.getTime() - b.data.getTime() || a.id.localeCompare(b.id));
  const fila: Lote[] = [];
  for (const m of ordenados) {
    if (m.tipo === "ENTRADA") {
      if (m.quantidade > 0) fila.push({ restante: m.quantidade, custoUnitario: m.custoUnitario });
    } else {
      consumirFifo(fila, m.quantidade);
    }
  }
  return fila;
}

export async function custoMedioProdutos(revendedorId: string) {
  const produtos = await prisma.produto.findMany({
    where: { revendedorId },
    include: { movimentos: true },
  });

  const mapa = new Map<
    string,
    { custoMedio: number; proximoCusto: number; atual: number; entradas: number; vendido: number }
  >();
  for (const produto of produtos) {
    const qtdEntrada = produto.movimentos.filter((m) => m.tipo === "ENTRADA").reduce((a, m) => a + m.quantidade, 0);
    const qtdSaida = produto.movimentos.filter((m) => m.tipo === "SAIDA").reduce((a, m) => a + m.quantidade, 0);

    // custoMedio aqui é o custo médio só do estoque que ainda está parado —
    // não da vida inteira do produto. Se um lote velho e barato já foi todo
    // vendido, ele não conta mais pro custo do que sobrou.
    const fila = lotesAbertos(produto.movimentos);
    const atual = fila.reduce((a, l) => a + l.restante, 0);
    const custoTotalAtual = fila.reduce((a, l) => a + l.restante * l.custoUnitario, 0);

    mapa.set(produto.id, {
      custoMedio: atual > 0 ? custoTotalAtual / atual : 0,
      proximoCusto: fila[0]?.custoUnitario ?? 0,
      atual: qtdEntrada - qtdSaida,
      entradas: qtdEntrada,
      vendido: qtdSaida,
    });
  }
  return mapa;
}

// Custo real (FIFO) de vender `quantidade` unidades agora — consome os
// lotes de compra mais antigos primeiro. Aceita um client de transação
// opcional pra rodar no mesmo snapshot da checagem de estoque em
// registrarVenda (vendas/actions.ts), evitando que duas vendas concorrentes
// "vejam" os mesmos lotes ainda abertos.
export async function custoConsumoFifo(
  produtoId: string,
  quantidade: number,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ custoUnitario: number; custoTotal: number }> {
  const movimentos = await db.movimentoEstoque.findMany({ where: { produtoId } });
  const fila = lotesAbertos(movimentos);
  const custoTotal = consumirFifo(fila, quantidade);
  return { custoUnitario: quantidade > 0 ? custoTotal / quantidade : 0, custoTotal };
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
  const custoApar = vendasMes.reduce((a, v) => a + v.quantidade * v.custoUnitario, 0);

  const receitaTotal = receitaRecorrente + receitaApar;
  const custoTotal = custoRecorrente + custoApar;
  const lucro = receitaTotal - custoTotal;

  const naoCancelados = clientes.filter((c) => c.status !== "CANCELADO");
  const vencendo = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "ATE_5_DIAS");
  const vencidos = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "VENCIDO");

  const { ano: anoAgora, mes: mesAgora } = diaCivilBr(agora);
  const proximoMes = brMidnightUTC(anoAgora, mesAgora + 1, 1);
  const depoisDoProximoMes = brMidnightUTC(anoAgora, mesAgora + 2, 1);
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
