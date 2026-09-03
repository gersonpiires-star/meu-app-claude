"use client";

import { useMemo, useState } from "react";
import { Card, Field, Input, cx } from "@/components/ui";
import { brl, brl0 } from "@/lib/format";
import { PRAZO_LABEL, precoAVista, tabelaParcelado, type Prazo } from "@/lib/maquininha";
import { salvarMargemPadrao } from "./actions";

const PRAZOS: Prazo[] = [0, 1, 2];

export function MaquininhaCalc({ margemInicial }: { margemInicial: number }) {
  const [custo, setCusto] = useState(0);
  const [margem, setMargem] = useState(margemInicial);
  const [prazo, setPrazo] = useState<Prazo>(0);

  const preco = useMemo(() => precoAVista(custo, margem), [custo, margem]);
  const tabela = useMemo(() => tabelaParcelado(preco, prazo), [preco, prazo]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Custo do produto (R$)">
            <Input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(Number(e.target.value))} />
          </Field>
          <Field label="Margem desejada (%)">
            <Input
              type="number"
              min={0}
              max={95}
              value={margem}
              onChange={(e) => setMargem(Number(e.target.value))}
              onBlur={(e) => salvarMargemPadrao(Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="mt-1 text-[11px] text-text-dim">A margem fica salva e sugere o preço de venda de aparelhos no registro de venda.</p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Preço à vista · Pix ou dinheiro</span>
          <span className="text-xl font-bold text-accent">{brl(preco)}</span>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Parcelado</h2>
        <div className="flex gap-1 rounded-lg border border-border-strong p-1">
          {PRAZOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrazo(p)}
              className={cx(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                prazo === p ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
              )}
            >
              {PRAZO_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0">
        <div className="grid grid-cols-4 gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          <span>Parc</span>
          <span>Taxa</span>
          <span className="text-right">Parcela</span>
          <span className="text-right">Total</span>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {tabela.map((l) => (
            <div key={l.parcelas} className="grid grid-cols-4 gap-3 px-4 py-2 text-sm">
              <span className="text-text">{l.parcelas}x</span>
              <span className="text-text-muted">{l.taxa.toFixed(2)}%</span>
              <span className="text-right font-semibold text-accent">{brl(l.parcela)}</span>
              <span className="text-right font-semibold text-text">{brl0(l.total)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
