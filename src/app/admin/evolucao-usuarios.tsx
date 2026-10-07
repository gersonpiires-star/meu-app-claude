"use client";

// Mesmo padrão visual/estrutural de ReceitaPorMes (app/(app)/relatorio/receita-por-mes.tsx)
// e GraficoMeses — barras simples em SVG/CSS, sem biblioteca de gráfico, com
// véu de "tem mais pra rolar" e tooltip nativo (title) por barra. Com mais de
// uma série (ex: revendedores e clientes), mostra pills pra trocar — parte
// de novo automaticamente na primeira que tiver dado real no período, pra
// não abrir num estado vazio quando a outra série tem números.
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";

type Ponto = { data: string; quantidade: number };
type Serie = { chave: string; label: string; pontos: Ponto[]; dicaVazio: string };

function dataCurtaISO(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function EvolucaoUsuarios({ series }: { series: Serie[] }) {
  const [ativa, setAtiva] = useState(
    () => (series.find((s) => s.pontos.some((p) => p.quantidade > 0)) ?? series[0]).chave,
  );
  const atual = series.find((s) => s.chave === ativa) ?? series[0];
  const serie = atual.pontos;
  const semDados = serie.every((p) => p.quantidade === 0);
  const topo = Math.max(1, ...serie.map((p) => p.quantidade));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [temEsquerda, setTemEsquerda] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function atualizar() {
      if (!el) return;
      setTemEsquerda(el.scrollLeft > 4);
    }
    el.scrollLeft = el.scrollWidth;
    atualizar();
    el.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      el.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, [serie]);

  const larguraMin = serie.length > 45 ? 10 : serie.length > 14 ? 20 : 36;

  return (
    <div className="flex flex-col gap-3">
      {series.length > 1 ? (
        <div className="flex gap-1 self-start rounded-xl border border-border-strong p-1 text-xs">
          {series.map((s) => (
            <button
              key={s.chave}
              type="button"
              onClick={() => setAtiva(s.chave)}
              className={cx(
                "whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition",
                ativa === s.chave ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      {semDados ? (
        <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-semibold text-text-dim">Nenhum cadastro novo nesse período</p>
          <p className="text-xs text-text-dim">{atual.dicaVazio}</p>
        </div>
      ) : (
        <div className="relative">
          <div ref={scrollRef} className="flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: 140 }}>
            {serie.map((p) => {
              const altura = p.quantidade === 0 ? 2 : Math.max(4, Math.round((p.quantidade / topo) * 100));
              return (
                <div
                  key={p.data}
                  className="flex flex-col items-center gap-1.5"
                  style={{ minWidth: larguraMin, flex: "1 0 auto" }}
                >
                  <div
                    className="w-full rounded-t-sm bg-[var(--chart-1)] transition-all hover:brightness-125"
                    style={{ height: altura, opacity: p.quantidade === 0 ? 0.25 : 1 }}
                    title={`${dataCurtaISO(p.data)}: ${p.quantidade} novo${p.quantidade === 1 ? "" : "s"}`}
                  />
                  {serie.length <= 31 ? (
                    <span className="text-[9px] font-semibold text-text-dim">{dataCurtaISO(p.data)}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent transition-opacity ${temEsquerda ? "opacity-100" : "opacity-0"}`}
          />
        </div>
      )}
    </div>
  );
}
