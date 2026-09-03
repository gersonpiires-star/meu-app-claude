import Link from "next/link";
import { cx } from "@/components/ui";

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function GraficoMeses({
  meses,
  selecionado,
}: {
  meses: { ano: number; mes: number; receita: number; custo: number }[];
  selecionado: { ano: number; mes: number };
}) {
  const topo = Math.max(1, ...meses.map((m) => Math.max(m.receita, m.custo)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2" style={{ height: 104 }}>
        {meses.map((m) => {
          const ativo = m.ano === selecionado.ano && m.mes === selecionado.mes;
          const hReceita = Math.max(2, Math.round((m.receita / topo) * 100));
          const hCusto = Math.max(1, Math.round((m.custo / topo) * 100));
          return (
            <Link
              key={`${m.ano}-${m.mes}`}
              href={`/relatorio?ano=${m.ano}&mes=${m.mes}`}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div className="flex h-[84px] w-full items-end justify-center gap-[3px]">
                <div
                  className={cx("w-[9px] rounded-t-sm transition-colors", ativo ? "bg-accent" : "bg-accent-strong/40")}
                  style={{ height: `${hReceita}%` }}
                />
                <div
                  className={cx("w-[6px] rounded-t-sm transition-colors", ativo ? "bg-danger" : "bg-danger/30")}
                  style={{ height: `${hCusto}%` }}
                />
              </div>
              <span className={cx("text-[10px] font-semibold uppercase tracking-wide", ativo ? "text-accent" : "text-text-dim")}>
                {MESES_ABREV[m.mes]}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="flex gap-4 border-t border-border-strong pt-3 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-sm bg-accent" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-sm bg-danger" /> Custos
        </span>
      </div>
    </div>
  );
}
