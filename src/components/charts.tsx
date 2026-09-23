"use client";

import { useId, useState } from "react";
import { cx } from "./ui";

// Anel de status (donut) — cada fatia é um arco de círculo desenhado via
// stroke-dasharray, com um respiro (gap) fixo entre elas em vez de traço
// contínuo, pra cada categoria ler como objeto separado mesmo em segmentos
// pequenos. Cores vêm de --chart-1/2/3 (globals.css), calibradas à parte das
// cores de UI porque essas precisam separar bem em visão de cores alteradas
// contra o fundo escuro — nunca trocar por accent/warning/danger direto.
const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function DonutChart({
  segmentos,
  centroLabel,
  centroValor,
}: {
  segmentos: { label: string; valor: number }[];
  centroLabel: string;
  centroValor: string;
}) {
  const gradId = useId();
  const [ativo, setAtivo] = useState<number | null>(null);
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  const raio = 42;
  const circ = 2 * Math.PI * raio;
  const gap = total > 0 ? 2.5 : 0; // respiro em % do círculo entre fatias
  let acumulado = 0;

  const arcos = segmentos.map((seg, i) => {
    const fatia = total > 0 ? (seg.valor / total) * 100 : 0;
    const comprimento = Math.max(0, fatia - gap);
    const offset = -acumulado * (circ / 100);
    acumulado += fatia;
    return { ...seg, comprimento, offset, cor: CHART_COLORS[i % CHART_COLORS.length] };
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: 108, height: 108 }}>
        <svg viewBox="0 0 100 100" className="-rotate-90" width={108} height={108}>
          <circle cx="50" cy="50" r={raio} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
          {total > 0
            ? arcos.map((a, i) => (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={raio}
                  fill="none"
                  stroke={a.cor}
                  strokeWidth={ativo === null || ativo === i ? 10 : 7}
                  strokeLinecap="round"
                  strokeDasharray={`${(a.comprimento / 100) * circ} ${circ}`}
                  strokeDashoffset={a.offset}
                  className="cursor-pointer transition-all"
                  opacity={ativo === null || ativo === i ? 1 : 0.35}
                  onMouseEnter={() => setAtivo(i)}
                  onMouseLeave={() => setAtivo(null)}
                >
                  <title>{`${a.label}: ${a.valor}`}</title>
                </circle>
              ))
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-text">
            {ativo !== null ? arcos[ativo].valor : centroValor}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-dim">
            {ativo !== null ? arcos[ativo].label : centroLabel}
          </span>
        </div>
        <span id={gradId} className="sr-only" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {segmentos.map((seg, i) => (
          <div
            key={seg.label}
            className={cx(
              "flex items-center justify-between gap-3 rounded-lg px-1.5 py-1 text-sm transition-colors",
              ativo === i ? "bg-surface-2" : ""
            )}
            onMouseEnter={() => setAtivo(i)}
            onMouseLeave={() => setAtivo(null)}
          >
            <span className="flex min-w-0 items-center gap-2 text-text-muted">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="shrink-0 font-bold tabular-nums text-text">{seg.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
