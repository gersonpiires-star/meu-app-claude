import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-2xl border border-border bg-surface p-5", className)}>
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
  "w-full rounded-xl border border-border-strong bg-bg-deep px-3.5 py-2.5 text-sm text-text placeholder:text-text-dim outline-none transition focus:border-accent focus:ring-1 focus:ring-accent";

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
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "accent" | "danger" | "warning";
}) {
  const valueTone =
    tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-text";
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{label}</span>
      <span className={cx("text-2xl font-bold", valueTone)}>{value}</span>
      {sub ? <span className="text-xs text-text-dim">{sub}</span> : null}
    </Card>
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
