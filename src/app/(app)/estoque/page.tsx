import { exigirRevendedor } from "@/lib/sessao";
import { custoMedioProdutos, limitesDoMes } from "@/lib/dados";
import { precoAVista } from "@/lib/maquininha";
import { prisma } from "@/lib/prisma";
import { brl, brl0, dataCurta } from "@/lib/format";
import { Card, EmptyState, StatTile } from "@/components/ui";
import { IconCaixa } from "@/components/nav-icons";
import { NovoProdutoForm } from "./novo-produto-form";
import { RegistrarEntradaForm } from "./registrar-entrada-form";
import { ProdutosTabela } from "./produtos-tabela";
import { criarProduto, registrarEntrada } from "./actions";

const IconUnidades = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M4 6.5 10 3l6 3.5v7L10 17l-6-3.5v-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M4.2 6.7 10 10l5.8-3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconValorParado = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.5v7M7.5 8.3c0-1 .9-1.8 2.5-1.8s2.5.7 2.5 1.6c0 2.2-5 .9-5 3 0 1 1 1.7 2.5 1.7s2.5-.7 2.5-1.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconVendidos = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 13l2.5 2.5L14 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default async function EstoquePage() {
  const revendedor = await exigirRevendedor();
  const { inicio, fim } = limitesDoMes();

  const [produtos, custos, vendasMes] = await Promise.all([
    prisma.produto.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: { modelo: "asc" },
    }),
    custoMedioProdutos(revendedor.id),
    prisma.venda.findMany({
      where: { revendedorId: revendedor.id, data: { gte: inicio, lt: fim } },
      include: { produto: true, cliente: true },
      orderBy: { data: "desc" },
    }),
  ]);

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-text">Estoque</h1>
          <NovoProdutoForm acao={criarProduto} />
        </div>
        <EmptyState>Nenhum modelo cadastrado</EmptyState>
      </div>
    );
  }

  const linhas = produtos.map((produto) => {
    const info = custos.get(produto.id) ?? { custoMedio: 0, atual: 0, entradas: 0, vendido: 0 };
    return {
      id: produto.id,
      modelo: produto.modelo,
      atual: info.atual,
      estoqueMinimo: produto.estoqueMinimo,
      custoMedio: info.custoMedio,
      precoSugerido: precoAVista(info.custoMedio, revendedor.margemPadrao),
      baixo: info.atual <= produto.estoqueMinimo,
    };
  });

  const baixos = linhas.filter((l) => l.baixo);
  const unidadesTotais = linhas.reduce((a, l) => a + l.atual, 0);
  const valorParado = linhas.reduce((a, l) => a + l.atual * l.custoMedio, 0);
  const vendidosNoMes = vendasMes.reduce((a, v) => a + v.quantidade, 0);

  const entradasRecentes = await prisma.movimentoEstoque.findMany({
    where: { produto: { revendedorId: revendedor.id }, tipo: "ENTRADA" },
    include: { produto: true },
    orderBy: { data: "desc" },
    take: 8,
  });

  const movimentacoes = [
    ...entradasRecentes.map((m) => ({
      id: `e-${m.id}`,
      data: m.data,
      label: `Entrada · ${m.produto.modelo}`,
      qtd: m.quantidade,
      detalhe: `${brl(m.quantidade * m.custoUnitario)}${m.fornecedor ? ` · ${m.fornecedor}` : ""}`,
      positivo: true,
    })),
    ...vendasMes.slice(0, 8).map((v) => ({
      id: `v-${v.id}`,
      data: v.data,
      label: `Saída · ${v.produto.modelo}`,
      qtd: -v.quantidade,
      detalhe: v.cliente?.nome ?? "Venda avulsa",
      positivo: false,
    })),
  ]
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Estoque</h1>
        <NovoProdutoForm acao={criarProduto} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Produtos"
          value={String(produtos.length)}
          sub={`${produtos.length} variante${produtos.length === 1 ? "" : "s"}`}
          icon={<IconCaixa className="h-3.5 w-3.5" />}
        />
        <StatTile label="Unidades" value={String(unidadesTotais)} sub="em estoque" icon={IconUnidades} />
        <StatTile label="Valor parado" value={brl0(valorParado)} sub="a preço de custo" icon={IconValorParado} />
        <StatTile label="Vendidos no mês" value={String(vendidosNoMes)} sub="neste mês" icon={IconVendidos} />
      </div>

      {baixos.length > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-warning-border bg-warning-bg/30">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
            <div>
              <p className="text-sm font-semibold text-warning">
                {baixos.length === 1
                  ? `${baixos[0].modelo} abaixo do mínimo`
                  : `${baixos.length} produtos abaixo do mínimo`}
              </p>
              <p className="text-xs text-text-dim">
                {baixos.map((b) => `${b.modelo}: ${b.atual} de ${b.estoqueMinimo}`).join(" · ")}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <Card className="min-w-0 flex-1">
          <ProdutosTabela produtos={linhas} />
        </Card>
        <div className="w-full md:w-[320px] md:shrink-0">
          <RegistrarEntradaForm produtos={produtos.map((p) => ({ id: p.id, modelo: p.modelo }))} acao={registrarEntrada} />
        </div>
      </div>

      {movimentacoes.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Movimentações</h2>
          <div className="flex flex-col divide-y divide-border">
            {movimentacoes.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-text-dim">{dataCurta(m.data)}</span>
                <span className="flex-1 truncate text-text-muted">{m.label}</span>
                <span className="truncate text-xs text-text-dim">{m.detalhe}</span>
                <span className={m.positivo ? "font-semibold text-accent" : "font-semibold text-danger"}>
                  {m.positivo ? "+" : ""}
                  {m.qtd}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
