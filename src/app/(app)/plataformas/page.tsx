import { exigirRevendedor } from "@/lib/sessao";
import { dadosPlataformas } from "@/lib/plataformas";
import { brl } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { NovaPlataformaForm } from "./nova-plataforma-form";
import { LoteForm } from "./lote-form";
import { adicionarLote } from "./actions";

export default async function PlataformasPage() {
  const revendedor = await exigirRevendedor();
  const plataformas = await dadosPlataformas(revendedor.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Plataformas</h1>
          <p className="text-xs text-text-dim">Fornecedores de créditos dos serviços que você revende</p>
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

                <div className="mt-3 border-t border-border pt-3">
                  <LoteForm acao={adicionarLote.bind(null, p.id)} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
