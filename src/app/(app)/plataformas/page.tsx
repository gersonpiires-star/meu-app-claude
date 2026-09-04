import { exigirRevendedor, souFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dadosPlataformas } from "@/lib/plataformas";
import { brl } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { NovaPlataformaForm } from "./nova-plataforma-form";
import { NovoAppForm } from "./novo-app-form";
import { LoteForm } from "./lote-form";
import { LoteItem } from "./lote-item";
import { ServicoItem } from "./servico-item";
import { adicionarLote, editarLote, criarAppNaPlataforma } from "./actions";

export default async function PlataformasPage() {
  const revendedor = await exigirRevendedor();
  const [plataformas, servicosSemPlataforma, ehFuncionario] = await Promise.all([
    dadosPlataformas(revendedor.id),
    prisma.servico.findMany({
      where: { revendedorId: revendedor.id, plataformaId: null },
      include: { _count: { select: { clientes: true } } },
      orderBy: { nome: "asc" },
    }),
    souFuncionario(),
  ]);

  const listaPlataformas = plataformas.map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Plataformas</h1>
          <p className="text-xs text-text-dim">Fornecedores de créditos e os apps que você revende com eles</p>
        </div>
        <NovaPlataformaForm />
      </div>

      {plataformas.length === 0 ? (
        <EmptyState>Nenhuma plataforma cadastrada ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {plataformas.map((p) => {
            const baixo = p.saldo <= p.minimo;
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{p.nome}</p>
                    <p className="text-xs text-text-dim">
                      Custo médio {brl(p.custoMedio)} por crédito
                      {p.servicos.length > 0 ? ` · ${p.servicos.map((s) => s.nome).join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {baixo ? <Badge tone="warning">Saldo baixo</Badge> : null}
                    <Badge tone={baixo ? "danger" : "accent"}>Saldo: {p.saldo}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-dim">Créditos comprados</p>
                    <p className="font-semibold text-text">{p.comprados}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-dim">Usados</p>
                    <p className="font-semibold text-text">{p.usados}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-dim">Investido</p>
                    <p className="font-semibold text-text">{brl(p.valorInvestido)}</p>
                  </div>
                </div>

                {p.lotes.length > 0 ? (
                  <div className="mt-3 flex flex-col divide-y divide-border border-t border-border">
                    {[...p.lotes]
                      .sort((a, b) => b.data.getTime() - a.data.getTime())
                      .map((l) => (
                        <LoteItem key={l.id} lote={l} acao={editarLote} podeEditar={!ehFuncionario} />
                      ))}
                  </div>
                ) : null}

                <div className="mt-3 border-t border-border pt-3">
                  <LoteForm acao={adicionarLote.bind(null, p.id)} />
                </div>

                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Apps dessa plataforma</p>
                  {p.servicos.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {p.servicos.map((s) => (
                        <ServicoItem
                          key={s.id}
                          servico={{
                            id: s.id,
                            nome: s.nome,
                            plataformaId: s.plataformaId,
                            custoCredito: s.custoCredito,
                            cobrancaTelaExtra: s.cobrancaTelaExtra,
                            totalClientes: s._count.clientes,
                          }}
                          plataformas={listaPlataformas}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mb-2 text-sm text-text-dim">Nenhum app vinculado ainda.</p>
                  )}
                  <div className="mt-2">
                    <NovoAppForm acao={criarAppNaPlataforma.bind(null, p.id)} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {servicosSemPlataforma.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Apps sem plataforma — vincule pra controlar o crédito
          </p>
          <div className="flex flex-col gap-2">
            {servicosSemPlataforma.map((s) => (
              <ServicoItem
                key={s.id}
                servico={{
                  id: s.id,
                  nome: s.nome,
                  plataformaId: s.plataformaId,
                  custoCredito: s.custoCredito,
                  cobrancaTelaExtra: s.cobrancaTelaExtra,
                  totalClientes: s._count.clientes,
                }}
                plataformas={listaPlataformas}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
