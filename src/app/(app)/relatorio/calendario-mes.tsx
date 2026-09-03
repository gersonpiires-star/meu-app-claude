"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import type { CelulaCalendario } from "@/lib/calendario";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const CORES: Record<NonNullable<CelulaCalendario["urgencia"]>, string> = {
  vencido: "bg-danger",
  vencendo: "bg-warning",
  ok: "bg-accent",
};

export function CalendarioMes({ celulas, hojeDia }: { celulas: CelulaCalendario[]; hojeDia: number }) {
  const [selecionado, setSelecionado] = useState<CelulaCalendario | null>(null);

  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase tracking-wider text-text-dim">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((c, i) =>
          c.dia === null ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={c.qtd === 0}
              onMouseEnter={() => c.qtd > 0 && setSelecionado(c)}
              onClick={() => setSelecionado((atual) => (atual?.dia === c.dia ? null : c.qtd > 0 ? c : null))}
              className={cx(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-[11px] outline-none transition",
                c.dia === hojeDia
                  ? "border border-accent-strong bg-accent-soft text-accent"
                  : c.qtd > 0
                    ? "cursor-pointer bg-surface-2 text-text hover:bg-border"
                    : "cursor-default text-text-dim",
                selecionado?.dia === c.dia && c.qtd > 0 ? "ring-1 ring-accent" : ""
              )}
            >
              <span>{c.dia}</span>
              {c.urgencia ? <span className={cx("h-1 w-1 rounded-full", CORES[c.urgencia])} /> : null}
            </button>
          )
        )}
      </div>

      {selecionado ? (
        <div className="mt-3 rounded-xl border border-border-strong bg-surface-2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Dia {selecionado.dia} · {selecionado.qtd} cliente{selecionado.qtd === 1 ? "" : "s"} vencendo
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {selecionado.clientes.map((nome, idx) => (
              <span key={idx} className="text-sm font-semibold text-text">
                {nome}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-dim">Toque num dia com vencimento pra ver quem é.</p>
      )}
    </div>
  );
}
