import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset]", className)}>
      {children}
    </div>
  );
}

// Caixa retrátil (acordeão) — usa <details>/<summary> nativos, então abre e
// fecha sem precisar de "use client" nem JavaScript. `extra` é pra um Badge
// de status ao lado do título (ex: "Configurado", "Beta").
export function CardRetratil({
  titulo,
  extra,
  defaultOpen = false,
  children,
}: {
  titulo: string;
  extra?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-border bg-surface" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-bold text-text">{titulo}</span>
          {extra}
        </span>
        <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0 text-text-dim transition-transform group-open:rotate-180">
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyles =
  "w-full rounded-xl border border-border-strong bg-field px-3.5 py-2.5 text-sm text-text placeholder:text-text-dim outline-none transition focus:border-accent focus:ring-1 focus:ring-accent";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={cx(inputStyles, className)} {...rest} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea className={cx(inputStyles, "min-h-24 resize-y", className)} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select className={cx(inputStyles, className)} {...rest} />;
}

export type ButtonVariant = "primary" | "ghost" | "danger" | "whatsapp" | "outline";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-bg-deep hover:brightness-110",
  ghost: "border border-border-strong text-text hover:bg-surface-2",
  danger: "bg-danger text-bg-deep hover:brightness-110",
  whatsapp: "bg-whatsapp text-bg-deep hover:brightness-110",
  outline: "border border-accent-strong bg-transparent text-accent",
};

// Exportado pra estilizar um <Link> como botão sem aninhar <button> dentro
// de <a> — aninhado, o <a> fica sem padding/borda próprios e desequilibra
// a divisão de largura quando ele é um irmão flex-1 de outro botão.
export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variantStyles[variant],
    className
  );
}

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClassName(variant, className)} {...rest} />;
}

type BadgeTone = "neutral" | "accent" | "warning" | "danger" | "success";

const badgeStyles: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-text-muted border-border",
  accent: "bg-accent-soft text-accent border-accent-strong",
  warning: "bg-warning-bg text-warning border-warning-border",
  danger: "bg-danger-bg text-danger border-danger-border",
  success: "bg-success-bg text-success border-success-border",
};

// Toggle liga/desliga puro CSS (peer-checked) — funciona em Server
// Component, sem precisar de "use client" nem onChange em JS: o valor só
// importa no submit do form que envolve ele (ver os 3 toggles de cobrança
// automática em Configurações).
export function Switch({
  name,
  defaultChecked,
  label,
  sub,
}: {
  name: string;
  defaultChecked?: boolean;
  label?: string;
  sub?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      {label ? (
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text">{label}</span>
          {sub ? <span className="block text-xs text-text-dim">{sub}</span> : null}
        </span>
      ) : null}
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" name={name} value="true" defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-surface-2 transition peer-checked:bg-accent" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        badgeStyles[tone]
      )}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "accent" | "danger" | "warning" | "money";
  icon?: ReactNode;
}) {
  const valueTone =
    tone === "accent" ? "text-accent" : tone === "money" ? "text-money" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text";
  const iconTone =
    tone === "accent" ? "bg-accent-soft text-accent" : tone === "money" ? "bg-money-bg text-money" : tone === "danger" ? "bg-danger-bg text-danger" : tone === "warning" ? "bg-warning-bg text-warning" : "bg-surface-2 text-text-dim";
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{label}</span>
        {icon ? <span className={cx("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", iconTone)}>{icon}</span> : null}
      </div>
      <span className={cx("text-2xl font-bold tabular-nums", valueTone)}>{value}</span>
      {sub ? <span className="text-xs text-text-dim">{sub}</span> : null}
    </Card>
  );
}

// Avatar com iniciais e cor fixa por nome — cada cliente ganha sempre a
// mesma cor (hash simples do nome), pra lista não ficar toda de uma cor só.
// O status (vencido/vencendo) fica no Badge, nunca na cor do avatar.
const AVATAR_CORES: Array<[string, string]> = [
  ["#123a38", "#5eead4"],
  ["#1e2748", "#a5b4fc"],
  ["#2e1f48", "#c4b5fd"],
  ["#3a1f33", "#f9a8d4"],
  ["#3a2a1a", "#fdba74"],
  ["#1a2f3a", "#7dd3fc"],
];

export function Avatar({ nome, size = 36 }: { nome: string; size?: number }) {
  const partes = nome.replace(/\(.*?\)/g, "").trim().split(/\s+/);
  const ini = ((partes[0]?.[0] ?? "?") + (partes[1]?.[0] ?? "")).toUpperCase();
  let h = 0;
  for (const ch of nome) h = (h + ch.charCodeAt(0)) % 997;
  const [bg, fg] = AVATAR_CORES[h % AVATAR_CORES.length];
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: Math.round(size * 0.36) }}
    >
      {ini}
    </span>
  );
}

// Minigráfico de linha (sparkline) em SVG puro — funciona em Server
// Component. Não mostra eixos: é só a tendência ao lado de um número.
export function Sparkline({
  valores,
  width = 120,
  height = 36,
  cor = "var(--money)",
  className,
}: {
  valores: number[];
  width?: number;
  height?: number;
  cor?: string;
  className?: string;
}) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const faixa = max - min || 1;
  const pts = valores.map((v, i) => {
    const x = (i * (width - 4)) / (valores.length - 1) + 2;
    const y = height - 3 - ((v - min) / faixa) * (height - 6);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))] as const;
  });
  const linha = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const [ux, uy] = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
      preserveAspectRatio="none"
      className={cx("block max-w-full", className)}
    >
      <polygon points={`2,${height} ${linha} ${ux},${height}`} fill={cor} fillOpacity={0.14} />
      <polyline points={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={ux} cy={uy} r={3} fill={cor} />
    </svg>
  );
}

// Anel de progresso (ex: meta do mês). `pct` de 0 a 100.
export function ProgressRing({
  pct,
  size = 96,
  espessura = 10,
  cor = "var(--money)",
  children,
}: {
  pct: number;
  size?: number;
  espessura?: number;
  cor?: string;
  children?: ReactNode;
}) {
  const r = (size - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={espessura} />
        {p > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={cor}
            strokeWidth={espessura}
            strokeLinecap="round"
            strokeDasharray={`${(p / 100) * circ} ${circ}`}
            className="transition-all duration-700"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// Selo de variação ("+18% vs agosto"). Positivo usa a cor de dinheiro,
// negativo usa danger.
export function TrendChip({ pct, sufixo }: { pct: number; sufixo?: string }) {
  const positivo = pct >= 0;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold",
        positivo ? "border-money-border bg-money-bg text-money" : "border-danger-border bg-danger-bg text-danger"
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={cx("h-3.5 w-3.5", !positivo && "rotate-90")}>
        <path d="m3 17 6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </svg>
      {positivo ? "+" : "−"}
      {Math.abs(pct).toFixed(0)}%{sufixo ? ` ${sufixo}` : ""}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-text-dim">
      {children}
    </div>
  );
}

export { cx };
