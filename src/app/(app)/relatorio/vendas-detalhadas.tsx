"use client";

import { useState } from "react";
import { cx } from "@/components/ui";

type LinhaDetalhe = { rot: string; val: string };
export type VendaDetalhe = {
  id: string;
  nome: string;
  detalhe: string;
  liquidoTexto: string;
  liquidoPositivo: boolean;
  linhas: LinhaDetalhe[];
};

export function VendasDetalhadas({ vendas }: { vendas: VendaDetalhe[] }) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (vendas.length === 0) {
    return <p className="text-sm text-text-dim">Nenhuma venda registrada neste mês</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {vendas.map((v) => {
        const expandido = aberto === v.id;
        return (
          <div
            key={v.id}
            className={cx("overflow-hidden rounded-xl border", expandido ? "border-accent-strong bg-accent-soft" : "border-border bg-surface-2")}
          >
            <button type="button" onClick={() => setAberto(expandido ? null : v.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{v.nome}</p>
                <p className="text-[11px] text-text-dim">{v.detalhe}</p>
              </span>
              <span className={cx("shrink-0 font-bold", v.liquidoPositivo ? "text-accent" : "text-danger")}>{v.liquidoTexto}</span>
              <span className="w-3 shrink-0 text-center text-text-dim">{expandido ? "−" : "+"}</span>
            </button>
            {expandido ? (
              <div className="flex flex-col divide-y divide-border px-4 pb-3">
                {v.linhas.map((l) => (
                  <div key={l.rot} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{l.rot}</span>
                    <span className="text-right text-sm font-semibold text-text">{l.val}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
