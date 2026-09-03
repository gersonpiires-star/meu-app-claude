import { cx } from "@/components/ui";
import type { CelulaCalendario } from "@/lib/calendario";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

const CORES: Record<NonNullable<CelulaCalendario["urgencia"]>, string> = {
  vencido: "bg-danger",
  vencendo: "bg-warning",
  ok: "bg-accent",
};

export function CalendarioMes({ celulas, hojeDia }: { celulas: CelulaCalendario[]; hojeDia: number }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((c, i) =>
          c.dia === null ? (
            <div key={i} />
          ) : (
            <div
              key={i}
              className={cx(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs",
                c.dia === hojeDia
                  ? "border border-accent-strong bg-accent-soft text-accent"
                  : c.qtd > 0
                    ? "bg-surface-2 text-text"
                    : "text-text-dim"
              )}
            >
              <span>{c.dia}</span>
              {c.urgencia ? (
                <span className={cx("h-1.5 w-1.5 rounded-full", CORES[c.urgencia])} />
              ) : null}
            </div>
          )
        )}
      </div>
    </div>
  );
}
