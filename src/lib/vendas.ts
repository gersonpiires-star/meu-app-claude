import { prisma } from "@/lib/prisma";
import { brMidnightUTC, diaCivilBr } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";
import { ultimosMeses } from "@/lib/relatorio";

export type TipoLinhaVenda = "RENOVACAO" | "APARELHO";

export type LinhaVenda = {
  id: string;
  tipo: TipoLinhaVenda;
  combo: boolean;
  data: Date;
  clienteId: string | null;
  clienteNome: string;
  detalhe: string;
  pagamento: string;
  valor: number;
  custo: number;
  lucro: number;
};

export async function dadosVendasMes(revendedorId: string, ano: number, mes: number) {
  const inicio = brMidnightUTC(ano, mes, 1);
  const fim = brMidnightUTC(ano, mes + 1, 1);

  const [renovacoes, vendasAvulsas] = await Promise.all([
    prisma.renovacao.findMany({
      where: { cliente: { revendedorId }, data: { gte: inicio, lt: fim } },
      include: {
        cliente: { select: { nome: true } },
        vendaCombo: { include: { produto: { select: { modelo: true } } } },
      },
      orderBy: { data: "desc" },
    }),
    prisma.venda.findMany({
      where: { revendedorId, data: { gte: inicio, lt: fim }, renovacaoId: null },
      include: { produto: { select: { modelo: true } }, cliente: { select: { nome: true } } },
      orderBy: { data: "desc" },
    }),
  ]);

  const linhas: LinhaVenda[] = [];

  for (const r of renovacoes) {
    if (r.vendaCombo) {
      const v = r.vendaCombo;
      const valor = r.valor + v.quantidade * v.valorUnitario;
      const custo = r.custo + v.quantidade * v.custoUnitario;
      linhas.push({
        id: r.id,
        tipo: "APARELHO",
        combo: true,
        data: r.data,
        clienteId: null,
        clienteNome: r.cliente.nome,
        detalhe: `Combo ${v.produto.modelo} + ${PLANO_LABEL[r.plano]}`,
        pagamento: v.formaPagamento,
        valor,
        custo,
        lucro: valor - custo,
      });
    } else {
      linhas.push({
        id: r.id,
        tipo: "RENOVACAO",
        combo: false,
        data: r.data,
        clienteId: null,
        clienteNome: r.cliente.nome,
        detalhe: PLANO_LABEL[r.plano],
        pagamento: r.formaPagamento ?? "—",
        valor: r.valor,
        custo: r.custo,
        lucro: r.valor - r.custo,
      });
    }
  }

  for (const v of vendasAvulsas) {
    const valor = v.quantidade * v.valorUnitario;
    const custo = v.quantidade * v.custoUnitario;
    linhas.push({
      id: v.id,
      tipo: "APARELHO",
      combo: false,
      data: v.data,
      clienteId: v.clienteId,
      clienteNome: v.cliente?.nome ?? "Venda avulsa",
      detalhe: v.produto.modelo,
      pagamento: v.formaPagamento,
      valor,
      custo,
      lucro: valor - custo,
    });
  }

  linhas.sort((a, b) => b.data.getTime() - a.data.getTime());

  const receita = linhas.reduce((a, l) => a + l.valor, 0);
  const custo = linhas.reduce((a, l) => a + l.custo, 0);
  const lucro = receita - custo;
  const ticketMedio = linhas.length > 0 ? receita / linhas.length : 0;
  const qtdRenovacoes = linhas.filter((l) => l.tipo === "RENOVACAO").length;
  const qtdAparelhos = linhas.filter((l) => l.tipo === "APARELHO").length;

  const porFormaPagamento = new Map<string, number>();
  for (const l of linhas) {
    porFormaPagamento.set(l.pagamento, (porFormaPagamento.get(l.pagamento) ?? 0) + l.valor);
  }
  const formasPagamento = [...porFormaPagamento.entries()]
    .map(([forma, valor]) => ({ forma, valor }))
    .sort((a, b) => b.valor - a.valor);

  return {
    linhas,
    vendasNoMes: linhas.length,
    qtdRenovacoes,
    qtdAparelhos,
    receita,
    custo,
    lucro,
    margem: receita > 0 ? (lucro / receita) * 100 : 0,
    ticketMedio,
    formasPagamento,
  };
}

// Mesmo mês/ano da referência (ou a atual) — usado tanto pra tela padrão
// (mês corrente) quanto pra navegação futura por "Setembro 2026" etc.
export function mesReferenciaAtual(): { ano: number; mes: number } {
  const { ano, mes } = diaCivilBr(new Date());
  return { ano, mes };
}

// "Por mês" da barra lateral de Vendas — reaproveita o mesmo cálculo do
// Relatório (ultimosMeses) pra não duplicar a lógica de receita por mês.
export async function receitaUltimosMeses(revendedorId: string, quantidade = 3) {
  return ultimosMeses(revendedorId, quantidade);
}
