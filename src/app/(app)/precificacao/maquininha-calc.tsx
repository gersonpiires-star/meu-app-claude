"use client";

import { useMemo, useState } from "react";
import { Card, Field, Input } from "@/components/ui";
import { brl } from "@/lib/format";
import { precoAVista, tabelaParcelado } from "@/lib/maquininha";

export function MaquininhaCalc() {
  const [custo, setCusto] = useState(0);
  const [margem, setMargem] = useState(34);

  const preco = useMemo(() => precoAVista(custo, margem), [custo, margem]);
  const tabela = useMemo(() => tabelaParcelado(preco), [preco]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Custo do produto (R$)">
            <Input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(Number(e.target.value))} />
          </Field>
          <Field label="Margem desejada (%)">
            <Input type="number" min={0} max={95} value={margem} onChange={(e) => setMargem(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Preço à vista · Pix ou dinheiro</span>
          <span className="text-xl font-bold text-accent">{brl(preco)}</span>
        </div>
      </Card>

      <Card className="p-0">
        <div className="grid grid-cols-3 gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          <span>Parc</span>
          <span>Taxa</span>
          <span>Parcela</span>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {tabela.map((l) => (
            <div key={l.parcelas} className="grid grid-cols-3 gap-3 px-4 py-2 text-sm">
              <span className="text-text">{l.parcelas}x</span>
              <span className="text-text-muted">{l.taxa.toFixed(2)}%</span>
              <span className="font-semibold text-accent">{brl(l.parcela)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
