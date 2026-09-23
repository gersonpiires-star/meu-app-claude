"use client";

import { useMemo, useState } from "react";
import { Card, Field, Input, cx } from "@/components/ui";
import { brl } from "@/lib/format";

const PLANOS_RENOVACAO = [
  { label: "Mensal", meses: 1 },
  { label: "2 meses", meses: 2 },
  { label: "3 meses", meses: 3 },
  { label: "6 meses", meses: 6 },
  { label: "12 meses", meses: 12 },
];

// Preço que, depois de descontar a margem desejada E a taxa do meio de
// pagamento (as duas como % do preço final, não do custo), sobra exatamente
// o custo + a margem em reais — por isso divide por (1 - margem - taxa) em
// vez de aplicar a margem e a taxa em cascata.
function precoComTaxa(custo: number, margemPct: number, taxaPct: number): number {
  const fator = 1 - margemPct / 100 - taxaPct / 100;
  if (fator <= 0) return custo;
  return custo / fator;
}

function lucroComTaxa(preco: number, custo: number, taxaPct: number): number {
  return preco - custo - preco * (taxaPct / 100);
}

function CardPreco({ label, preco, lucro, comTaxa, destaque = false }: { label: string; preco: number; lucro: number; comTaxa: boolean; destaque?: boolean }) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-xl border p-4", destaque ? "border-accent-strong bg-accent-soft" : "border-border bg-surface-2")}>
      <span className="text-xs font-semibold text-text-dim">{label}</span>
      <span className={cx("text-xl font-bold", destaque ? "text-accent" : "text-text")}>{brl(preco)}</span>
      <span className="text-[11px] text-text-dim">
        {comTaxa ? "taxa incluída" : "sem taxa"} · lucro {brl(lucro)}
      </span>
    </div>
  );
}

export function ComboCalc({
  margemInicial,
  produtos,
}: {
  margemInicial: number;
  produtos: { id: string; modelo: string; custoProximoLote: number }[];
}) {
  const [custoAparelho, setCustoAparelho] = useState<number | "">(produtos[0]?.custoProximoLote ?? 0);
  const [custoCredito, setCustoCredito] = useState<number | "">(0);
  const [mesesCombo, setMesesCombo] = useState(1);
  const [margem, setMargem] = useState<number | "">(margemInicial);
  const [taxaAVista, setTaxaAVista] = useState<number | "">(5);
  const [taxaParcelado, setTaxaParcelado] = useState<number | "">(18);

  const custoTotalCombo = useMemo(
    () => (Number(custoAparelho) || 0) + (Number(custoCredito) || 0) * mesesCombo,
    [custoAparelho, custoCredito, mesesCombo]
  );

  const precoPix = precoComTaxa(custoTotalCombo, Number(margem) || 0, 0);
  const precoMP = precoComTaxa(custoTotalCombo, Number(margem) || 0, Number(taxaAVista) || 0);
  const precoParcelado = precoComTaxa(custoTotalCombo, Number(margem) || 0, Number(taxaParcelado) || 0);

  const tabelaRenovacao = PLANOS_RENOVACAO.map((p) => {
    const custo = (Number(custoCredito) || 0) * p.meses;
    const preco = precoComTaxa(custo, Number(margem) || 0, 0);
    return { ...p, custo, preco, lucro: preco - custo };
  });

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <Card className="flex min-w-0 flex-1 flex-col gap-4">
        <h2 className="text-sm font-bold text-text">Seus custos</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Custo do aparelho">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={custoAparelho}
              onChange={(e) => setCustoAparelho(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
          <Field label="Custo do crédito por mês">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={custoCredito}
              onChange={(e) => setCustoCredito(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
          <Field label="Meses de plano no combo">
            <Input type="number" min={1} value={mesesCombo} onChange={(e) => setMesesCombo(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <Field label="Margem de lucro desejada (%)">
            <Input
              type="number"
              min={0}
              max={95}
              value={margem}
              onChange={(e) => setMargem(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
          <Field label="Taxa Mercado Pago à vista (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={taxaAVista}
              onChange={(e) => setTaxaAVista(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
          <Field label="Taxa parcelado em 12x (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={taxaParcelado}
              onChange={(e) => setTaxaParcelado(e.target.value === "" ? "" : Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-text">Preço sugerido do combo</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <CardPreco label="Pix / dinheiro" preco={precoPix} lucro={precoPix - custoTotalCombo} comTaxa={false} destaque />
            <CardPreco label="Mercado Pago à vista" preco={precoMP} lucro={lucroComTaxa(precoMP, custoTotalCombo, Number(taxaAVista) || 0)} comTaxa />
            <CardPreco label="Parcelado 12x" preco={precoParcelado} lucro={lucroComTaxa(precoParcelado, custoTotalCombo, Number(taxaParcelado) || 0)} comTaxa />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-text-dim">Custo total do combo</span>
            <span className="font-semibold text-text">{brl(custoTotalCombo)}</span>
          </div>
        </Card>

        <Card className="p-0">
          <h2 className="p-4 pb-2 text-sm font-bold text-text">Tabela de renovações (Pix)</h2>
          <div className="grid grid-cols-4 gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            <span>Plano</span>
            <span>Custo</span>
            <span>Preço sugerido</span>
            <span>Lucro</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {tabelaRenovacao.map((r) => (
              <div key={r.meses} className="grid grid-cols-4 items-center gap-3 px-4 py-2.5 text-sm">
                <span className="font-semibold text-text">{r.label}</span>
                <span className="text-text-muted">{brl(r.custo)}</span>
                <span className="font-semibold text-accent">{brl(r.preco)}</span>
                <span className="font-semibold text-money">{brl(r.lucro)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
