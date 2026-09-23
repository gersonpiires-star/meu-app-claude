import Link from "next/link";
import { cx } from "@/components/ui";
import { brl0 } from "@/lib/format";

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
              <div className="group/bar flex h-[84px] w-full items-end justify-center gap-[3px]" title={`${MESES_ABREV[m.mes]}: entradas ${brl0(m.receita)} · custos ${brl0(m.custo)}`}>
                <div
                  className={cx("w-[9px] rounded-t-full transition-all group-hover/bar:brightness-125", ativo ? "opacity-100" : "opacity-45")}
                  style={{ height: `${hReceita}%`, background: "var(--chart-1)" }}
                />
                <div
                  className={cx("w-[6px] rounded-t-full transition-all group-hover/bar:brightness-125", ativo ? "opacity-100" : "opacity-45")}
                  style={{ height: `${hCusto}%`, background: "var(--chart-3)" }}
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
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--chart-1)" }} /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--chart-3)" }} /> Custos
        </span>
      </div>
    </div>
  );
}
