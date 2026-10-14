import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { PLANO_MESES, faixaVencimento } from "@/lib/planos";
import { ehAniversarioDeCasa } from "@/lib/aniversario";
import { saldoTotalCreditos } from "@/lib/plataformas";
import { diaCivilBr, inicioDoDiaBr, brMidnightUTC } from "@/lib/format";
import { faixaPontualidade } from "@/lib/pontualidade";
import { serieAcumuladaDoMes } from "@/lib/meses";

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
export type MovimentoOrdenavel = { tipo: "ENTRADA" | "SAIDA"; quantidade: number; custoUnitario: number; data: Date; id: string };

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
// compras de fato vão sendo consumidas. Essa passada ainda é O(movimentos
// desde sempre) — não tem como saber quais lotes continuam abertos sem
// reconstituir o consumo FIFO inteiro a partir do histórico real — mas
// devolve os totais de entrada/saída como subproduto da mesma varredura,
// em vez de custoMedioProdutos varrer os mesmos movimentos de novo (2x) só
// pra somar isso.
export function lotesAbertos(movimentos: MovimentoOrdenavel[]): { fila: Lote[]; qtdEntrada: number; qtdSaida: number } {
  const ordenados = [...movimentos].sort((a, b) => a.data.getTime() - b.data.getTime() || a.id.localeCompare(b.id));
  const fila: Lote[] = [];
  let qtdEntrada = 0;
  let qtdSaida = 0;
  for (const m of ordenados) {
    if (m.tipo === "ENTRADA") {
      qtdEntrada += m.quantidade;
      if (m.quantidade > 0) fila.push({ restante: m.quantidade, custoUnitario: m.custoUnitario });
    } else {
      qtdSaida += m.quantidade;
      consumirFifo(fila, m.quantidade);
    }
  }
  return { fila, qtdEntrada, qtdSaida };
}

// Seleção mínima de MovimentoEstoque pra reconstituir o FIFO — usada só
// pelo backfill/restore (lotesAbertos opera no histórico completo); o dia a
// dia lê/grava direto em Produto.lotesAbertosJson via registrarMovimentoEstoque.
export const SELECAO_MOVIMENTO_FIFO = { tipo: true, quantidade: true, custoUnitario: true, data: true, id: true } as const;

// Produto.lotesAbertosJson guarda [{ restante, custoUnitario }, ...] — Json
// não garante esse formato em tempo de compilação, então valida cada item
// na leitura (um valor fora do formato esperado vira "ignora esse lote" em
// vez de quebrar a tela toda).
export function filaDeJson(json: Prisma.JsonValue): Lote[] {
  if (!Array.isArray(json)) return [];
  const fila: Lote[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const { restante, custoUnitario } = item as Record<string, unknown>;
    if (typeof restante === "number" && typeof custoUnitario === "number") {
      fila.push({ restante, custoUnitario });
    }
  }
  return fila;
}

function filaParaJson(fila: Lote[]): Prisma.InputJsonValue {
  return fila.map((l) => ({ restante: l.restante, custoUnitario: l.custoUnitario }));
}

export async function custoMedioProdutos(revendedorId: string) {
  const [produtos, totaisPorTipo] = await Promise.all([
    prisma.produto.findMany({ where: { revendedorId }, select: { id: true, lotesAbertosJson: true } }),
    // Entradas/saídas totais via agregação no banco (um groupBy só, pra
    // todos os produtos do revendedor de uma vez) — não precisa trazer
    // nenhuma linha de movimento pra memória só pra somar quantidade.
    prisma.movimentoEstoque.groupBy({
      by: ["produtoId", "tipo"],
      where: { produto: { revendedorId } },
      _sum: { quantidade: true },
    }),
  ]);
  const totalPorProdutoTipo = new Map<string, number>();
  for (const t of totaisPorTipo) totalPorProdutoTipo.set(`${t.produtoId}:${t.tipo}`, t._sum.quantidade ?? 0);

  const mapa = new Map<
    string,
    { custoMedio: number; proximoCusto: number; atual: number; entradas: number; vendido: number }
  >();
  for (const produto of produtos) {
    // custoMedio aqui é o custo médio só do estoque que ainda está parado —
    // não da vida inteira do produto. Lido direto da fila FIFO já
    // mantida incrementalmente (lotesAbertosJson) — ver
    // registrarMovimentoEstoque, único lugar que escreve nesse campo —
    // nunca reconstituída do histórico aqui.
    const fila = filaDeJson(produto.lotesAbertosJson);
    const atual = fila.reduce((a, l) => a + l.restante, 0);
    const custoTotalAtual = fila.reduce((a, l) => a + l.restante * l.custoUnitario, 0);

    mapa.set(produto.id, {
      custoMedio: atual > 0 ? custoTotalAtual / atual : 0,
      proximoCusto: fila[0]?.custoUnitario ?? 0,
      atual: (totalPorProdutoTipo.get(`${produto.id}:ENTRADA`) ?? 0) - (totalPorProdutoTipo.get(`${produto.id}:SAIDA`) ?? 0),
      entradas: totalPorProdutoTipo.get(`${produto.id}:ENTRADA`) ?? 0,
      vendido: totalPorProdutoTipo.get(`${produto.id}:SAIDA`) ?? 0,
    });
  }
  return mapa;
}

// Único write path que pode criar um MovimentoEstoque — grava o movimento E
// atualiza a fila FIFO persistida (Produto.lotesAbertosJson) no mesmo
// passo, pra esse cache nunca ficar fora de sincronia com o histórico real.
// Pra SAIDA, consome a fila e devolve o custo real (FIFO) — substitui o que
// antes era uma chamada separada a lotesAbertos/consumirFifo lendo o
// histórico inteiro toda vez. Aceita client de transação opcional pelo
// mesmo motivo de estoqueAtualProduto: rodar no mesmo snapshot da checagem
// de estoque em registrarVenda (vendas/actions.ts), evitando que duas
// vendas concorrentes "vejam" os mesmos lotes ainda abertos.
export async function registrarMovimentoEstoque(
  args: {
    produtoId: string;
    tipo: "ENTRADA" | "SAIDA";
    quantidade: number;
    custoUnitario?: number;
    fornecedor?: string | null;
    data?: Date;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ custoUnitario: number; custoTotal: number }> {
  const produto = await db.produto.findUniqueOrThrow({
    where: { id: args.produtoId },
    select: { lotesAbertosJson: true },
  });
  const fila = filaDeJson(produto.lotesAbertosJson);

  let custoUnitario: number;
  let custoTotal: number;
  if (args.tipo === "ENTRADA") {
    custoUnitario = args.custoUnitario ?? 0;
    custoTotal = custoUnitario * args.quantidade;
    if (args.quantidade > 0) fila.push({ restante: args.quantidade, custoUnitario });
  } else {
    custoTotal = consumirFifo(fila, args.quantidade);
    custoUnitario = args.quantidade > 0 ? custoTotal / args.quantidade : 0;
  }

  await db.movimentoEstoque.create({
    data: {
      produtoId: args.produtoId,
      tipo: args.tipo,
      quantidade: args.quantidade,
      custoUnitario,
      fornecedor: args.fornecedor ?? null,
      ...(args.data ? { data: args.data } : {}),
    },
  });
  await db.produto.update({ where: { id: args.produtoId }, data: { lotesAbertosJson: filaParaJson(fila) } });

  return { custoUnitario, custoTotal };
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
      where: { revendedorId, data: { gte: inicio, lt: fim } },
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
  // Taxa da maquininha (cartão) também sai do bolso — sem descontar aqui, o
  // lucro do painel ficava maior do que a soma dos "líquido" de cada venda
  // mostrados no Relatório, que já descontam essa taxa.
  const taxaApar = vendasMes.reduce((a, v) => a + v.quantidade * v.valorUnitario * (v.taxaPercentual / 100), 0);

  const receitaTotal = receitaRecorrente + receitaApar;
  const custoTotal = custoRecorrente + custoApar + taxaApar;
  const lucro = receitaTotal - custoTotal;

  const naoCancelados = clientes.filter((c) => c.status !== "CANCELADO");
  const vencendo = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "ATE_5_DIAS");
  const vencidos = naoCancelados.filter((c) => faixaVencimento(c.vencimento, agora) === "VENCIDO");

  // "Esfriando": quem historicamente só renova depois de várias cobranças
  // (faixaPontualidade PRECISA_INSISTIR/SO_PAGA_COBRADO) e está bem na hora
  // do ciclo em que isso normalmente aparece — vencendo ou já vencido. É o
  // sinal mais parecido com "risco de cancelamento silencioso" que dá pra
  // tirar dos dados que já existem (não tem como saber se o cliente "sumiu"
  // sem ter contato dele fora do WhatsApp, que o app não acompanha).
  const emRiscoIds = [...vencidos, ...vencendo].map((c) => c.id);
  const [cobrancasPorCliente, renovacoesPorCliente] =
    emRiscoIds.length > 0
      ? await Promise.all([
          prisma.cobranca.groupBy({ by: ["clienteId"], where: { clienteId: { in: emRiscoIds } }, _count: { _all: true } }),
          prisma.renovacao.groupBy({ by: ["clienteId"], where: { clienteId: { in: emRiscoIds } }, _count: { _all: true } }),
        ])
      : [[], []];
  const cobrancasMap = new Map(cobrancasPorCliente.map((c) => [c.clienteId, c._count._all]));
  const renovacoesMap = new Map(renovacoesPorCliente.map((r) => [r.clienteId, r._count._all]));
  const clientesEsfriando = [...vencidos, ...vencendo]
    .map((c) => ({ cliente: c, pontualidade: faixaPontualidade(cobrancasMap.get(c.id) ?? 0, renovacoesMap.get(c.id) ?? 0) }))
    .filter((c) => c.pontualidade.faixa === "PRECISA_INSISTIR" || c.pontualidade.faixa === "SO_PAGA_COBRADO")
    .sort((a, b) => b.pontualidade.razao - a.pontualidade.razao)
    .slice(0, 8);

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

  // previstoProxMes assume que todo mundo que vence renova — otimista
  // demais pra decisão de verdade. Essa versão pondera pela taxa de
  // retenção real dos últimos 30 dias, dando uma estimativa mais honesta
  // de quanto realmente deve entrar (custo não pondera: quem não renova
  // também não gera custo de crédito).
  const previstoProxMesRealista = projReceitaProxMes * (taxaRetencao / 100) - projCustoProxMes * (taxaRetencao / 100);

  const aniversariantes = naoCancelados
    .map((c) => ({ cliente: c, ...ehAniversarioDeCasa(c.criadoEm, agora) }))
    .filter((a) => a.ehAniversario);

  // Conta renovações + vendas do mês pra dar o ticket médio no Painel —
  // nenhuma query nova, os dois arrays já foram buscados acima.
  const transacoesMes = renovacoesMes.length + vendasMes.length;

  return {
    receitaRecorrente,
    receitaApar,
    receitaTotal,
    custoTotal,
    lucro,
    transacoesMes,
    proximoMes,
    previstoProxMes,
    previstoProxMesRealista,
    totalClientes: naoCancelados.length,
    ativos: naoCancelados.length,
    vencendo,
    vencidos,
    canceladosMes,
    taxaRetencao,
    clientesEsfriando,
    aniversariantes,
    produtosBaixoEstoque,
    temClientes: clientes.length > 0,
    saldoCreditos: creditos.saldo,
    creditosBaixos: creditos.baixo,
    leadsParaRetornar,
  };
}

// Receita acumulada dia a dia no mês atual (até hoje) e no mês anterior —
// alimenta o minigráfico do Painel e a comparação "vs mês passado", que
// compara com o MESMO ponto do mês anterior (dia 1 até o dia de hoje), e não
// com o mês anterior inteiro, pra não parecer queda só porque o mês atual
// ainda não acabou.
export async function serieReceitaMes(revendedorId: string, agora: Date = new Date()) {
  const { ano, mes } = diaCivilBr(agora);
  const inicioAnterior = brMidnightUTC(ano, mes - 1, 1);
  const { fim } = limitesDoMes(agora);

  const [renovacoes, vendas] = await Promise.all([
    prisma.renovacao.findMany({
      where: { revendedorId, data: { gte: inicioAnterior, lt: fim } },
      select: { valor: true, data: true },
    }),
    prisma.venda.findMany({
      where: { revendedorId, data: { gte: inicioAnterior, lt: fim } },
      select: { quantidade: true, valorUnitario: true, data: true },
    }),
  ]);

  return serieAcumuladaDoMes(
    [
      ...renovacoes.map((r) => ({ data: r.data, valor: r.valor })),
      ...vendas.map((v) => ({ data: v.data, valor: v.quantidade * v.valorUnitario })),
    ],
    agora
  );
}
