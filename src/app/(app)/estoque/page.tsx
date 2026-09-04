import { exigirRevendedor } from "@/lib/sessao";
import { custoMedioProdutos } from "@/lib/dados";
import { prisma } from "@/lib/prisma";
import { brl, dataCurta } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { NovoProdutoForm } from "./novo-produto-form";
import { ReporForm } from "./repor-form";
import { criarProduto, reporEstoque } from "./actions";

export default async function EstoquePage() {
  const revendedor = await exigirRevendedor();
  const [produtos, custos] = await Promise.all([
    prisma.produto.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: { modelo: "asc" },
      include: { movimentos: { where: { tipo: "ENTRADA" }, orderBy: { data: "desc" } } },
    }),
    custoMedioProdutos(revendedor.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Estoque</h1>
        <NovoProdutoForm acao={criarProduto} />
      </div>

      {produtos.length === 0 ? (
        <EmptyState>Nenhum modelo cadastrado</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {produtos.map((produto) => {
            const info = custos.get(produto.id) ?? { custoMedio: 0, atual: 0, entradas: 0, vendido: 0 };
            const baixoEstoque = info.atual <= produto.estoqueMinimo;
            return (
              <Card key={produto.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{produto.modelo}</p>
                    <p className="text-xs text-text-dim">Custo médio {brl(info.custoMedio)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {baixoEstoque ? <Badge tone="warning">Repor estoque</Badge> : null}
                    <Badge tone={baixoEstoque ? "danger" : "accent"}>Atual: {info.atual}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-dim">Entradas</p>
                    <p className="font-semibold text-text">{info.entradas}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-dim">Vendido</p>
                    <p className="font-semibold text-text">{info.vendido}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-dim">Mínimo</p>
                    <p className="font-semibold text-text">{produto.estoqueMinimo}</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-border pt-3">
                  <ReporForm acao={reporEstoque.bind(null, produto.id)} />
                </div>

                {produto.movimentos.length > 0 ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="mb-2 text-[11px] uppercase tracking-wider text-text-dim">Lançamentos de compra</p>
                    <div className="flex flex-col divide-y divide-border text-sm">
                      {produto.movimentos.map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-3 py-1.5">
                          <span className="text-text-dim">{m.quantidade}</span>
                          <span className="flex-1 text-text-muted">{dataCurta(m.data)}</span>
                          <span className="text-text-dim">{brl(m.custoUnitario)}/un</span>
                          <span className="font-semibold text-text">total {brl(m.quantidade * m.custoUnitario)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
