import { brl0 } from "@/lib/format";

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function ReceitaPorMes({ meses }: { meses: { ano: number; mes: number; receita: number }[] }) {
  const topo = Math.max(1, ...meses.map((m) => m.receita));

  return (
    <div className="flex items-end gap-3 overflow-x-auto pb-1" style={{ minHeight: 160 }}>
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
  );
}
