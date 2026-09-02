import Link from "next/link";
import { cx } from "@/components/ui";

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function GraficoMeses({
  meses,
  selecionado,
}: {
  meses: { ano: number; mes: number; lucro: number }[];
  selecionado: { ano: number; mes: number };
}) {
  const maiorAbs = Math.max(1, ...meses.map((m) => Math.abs(m.lucro)));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
        Toque numa barra para ver o mês
      </p>
      <div className="flex items-end gap-2" style={{ height: 96 }}>
        {meses.map((m) => {
          const altura = Math.max(4, (Math.abs(m.lucro) / maiorAbs) * 80);
          const ativo = m.ano === selecionado.ano && m.mes === selecionado.mes;
          return (
            <Link
              key={`${m.ano}-${m.mes}`}
              href={`/relatorio?ano=${m.ano}&mes=${m.mes}`}
              className="flex flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div
                className={cx(
                  "w-full rounded-t-md transition",
                  m.lucro < 0 ? "bg-danger" : ativo ? "bg-accent" : "bg-accent-strong"
                )}
                style={{ height: altura }}
              />
              <span className={cx("text-[10px] font-semibold", ativo ? "text-accent" : "text-text-dim")}>
                {MESES_ABREV[m.mes]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
