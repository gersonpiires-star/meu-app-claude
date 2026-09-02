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

type ButtonVariant = "primary" | "ghost" | "danger" | "whatsapp";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-bg-deep hover:brightness-110",
  ghost: "border border-border-strong text-text hover:bg-surface-2",
  danger: "bg-danger text-bg-deep hover:brightness-110",
  whatsapp: "bg-whatsapp text-bg-deep hover:brightness-110",
};

export function Button({
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        className
      )}
      {...rest}
    />
  );
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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
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
