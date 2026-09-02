import { prisma } from "@/lib/prisma";
import { custoMedioProdutos, limitesDoMes } from "@/lib/dados";

export async function ultimosMeses(revendedorId: string, quantidade = 6) {
  const agora = new Date();
  const meses: { ano: number; mes: number; receita: number; custo: number; lucro: number }[] = [];

  const custos = await custoMedioProdutos(revendedorId);

  for (let i = quantidade - 1; i >= 0; i--) {
    const referencia = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const { inicio, fim } = limitesDoMes(referencia);

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

    meses.push({ ano: referencia.getFullYear(), mes: referencia.getMonth(), receita, custo, lucro: receita - custo });
  }

  return meses;
}

export async function dadosMes(revendedorId: string, ano: number, mes: number) {
  const referencia = new Date(ano, mes, 1);
  const { inicio, fim } = limitesDoMes(referencia);
  const custos = await custoMedioProdutos(revendedorId);

  const [renovacoes, vendas, cancelados] = await Promise.all([
    prisma.renovacao.findMany({
      where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } },
      include: { cliente: { include: { servico: true } } },
      orderBy: { data: "desc" },
    }),
    prisma.venda.findMany({
      where: { revendedorId, data: { gte: inicio, lt: fim } },
      include: { produto: true },
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

  const porServico = new Map<string, number>();
  for (const r of renovacoes) {
    const nome = r.cliente.servico?.nome ?? "Sem serviço";
    porServico.set(nome, (porServico.get(nome) ?? 0) + r.valor);
  }

  const porProduto = new Map<string, number>();
  for (const v of vendas) {
    const custoMedio = custos.get(v.produtoId)?.custoMedio ?? 0;
    const bruto = v.quantidade * v.valorUnitario;
    const taxa = bruto * (v.taxaPercentual / 100);
    const custoTotal = v.quantidade * custoMedio;
    const liquido = bruto - taxa - custoTotal;
    porProduto.set(v.produto.modelo, (porProduto.get(v.produto.modelo) ?? 0) + liquido);
  }

  return {
    receita,
    custo,
    lucro,
    margem,
    custoRenov,
    custoVendas,
    renovacoes,
    vendas,
    cancelados,
    porServico: [...porServico.entries()],
    porProduto: [...porProduto.entries()],
  };
}

export async function proximoMes(revendedorId: string) {
  const agora = new Date();
  const proximo = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  const depois = new Date(agora.getFullYear(), agora.getMonth() + 2, 1);

  const vencendo = await prisma.cliente.findMany({
    where: { revendedorId, status: { not: "CANCELADO" }, vencimento: { gte: proximo, lt: depois } },
  });

  return {
    referencia: proximo,
    quantidade: vencendo.length,
    previsto: vencendo.reduce((a, c) => a + c.valorPlano, 0),
  };
}
