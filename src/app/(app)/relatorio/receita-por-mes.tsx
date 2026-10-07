"use client";

import { useEffect, useRef, useState } from "react";
import { brl0 } from "@/lib/format";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ReceitaPorMes({ meses }: { meses: { ano: number; mes: number; receita: number }[] }) {
  const semReceita = meses.every((m) => m.receita === 0);
  const topo = Math.max(1, ...meses.map((m) => m.receita));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [temEsquerda, setTemEsquerda] = useState(false);

  // Com muitos meses, as colunas (min-w-[52px] cada) não cabem na largura
  // do celular e o container rola pro lado — só que o scroll nasce parado
  // no início, escondendo justo o mês ATUAL (o último, destacado em
  // --accent) fora da tela sem nenhum indício de que dá pra arrastar.
  // Começa já rolado pro fim (mês atual sempre visível de cara) e mostra um
  // véu à esquerda só enquanto sobrar histórico escondido daquele lado.
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
  }, [meses]);

  if (semReceita) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-semibold text-text-dim">Nenhuma receita registrada ainda</p>
        <p className="text-xs text-text-dim">O gráfico aparece assim que a primeira cobrança entrar.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex items-end gap-3 overflow-x-auto pb-1" style={{ minHeight: 160 }}>
        {meses.map((m, i) => {
          const altura = Math.max(3, Math.round((m.receita / topo) * 110));
          const ultimo = i === meses.length - 1;
          return (
            <div key={`${m.ano}-${m.mes}`} className="flex min-w-[52px] flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-text">{brl0(m.receita)}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  height: altura,
                  background: ultimo ? "var(--accent)" : "var(--chart-1)",
                  opacity: ultimo ? 1 : 0.55,
                }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">{MESES_ABREV[m.mes]}</span>
            </div>
          );
        })}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-surface to-transparent transition-opacity ${temEsquerda ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
