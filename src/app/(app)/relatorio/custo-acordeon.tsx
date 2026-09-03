"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { brl } from "@/lib/format";

export type LinhaCusto = { nome: string; detalhe: string; meio: string; custo: number };

export function CustoAcordeon({
  titulo,
  legenda,
  total,
  tituloColuna,
  colunaMeio,
  linhas,
  vazio,
}: {
  titulo: string;
  legenda: string;
  total: number;
  tituloColuna: string;
  colunaMeio: string;
  linhas: LinhaCusto[];
  vazio: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-danger-border bg-danger-bg">
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
        <span className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">{titulo}</p>
          <p className="text-[11px] text-danger">{legenda}</p>
        </span>
        <span className="shrink-0 font-bold text-danger">− {brl(total)}</span>
        <span className="w-3 shrink-0 text-center text-text-dim">{aberto ? "−" : "+"}</span>
      </button>
      {aberto ? (
        <div className="flex flex-col px-4 pb-3.5">
          <div className="flex border-t border-danger-border py-1.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
            <span className="flex-1">{tituloColuna}</span>
            <span className="w-16 text-right">{colunaMeio}</span>
            <span className="w-20 text-right">Custo</span>
          </div>
          {linhas.length === 0 ? (
            <p className="border-t border-danger-border py-3 text-sm text-danger">{vazio}</p>
          ) : (
            linhas.map((l) => (
              <div key={l.nome} className={cx("flex items-baseline border-t border-danger-border py-2")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text">{l.nome}</span>
                  <span className="block text-[11px] text-danger">{l.detalhe}</span>
                </span>
                <span className="w-16 shrink-0 text-right text-xs text-text-dim">{l.meio}</span>
                <span className="w-20 shrink-0 text-right text-sm font-semibold text-danger">− {brl(l.custo)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
