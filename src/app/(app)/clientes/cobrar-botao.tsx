import Link from "next/link";
import { Button, cx } from "@/components/ui";
import { horaCurta } from "@/lib/format";

export function CobrarBotao({
  clienteId,
  cobradoEm,
  label = "Cobrar",
  variant = "ghost",
  className,
}: {
  clienteId: string;
  cobradoEm: Date | null;
  label?: string;
  variant?: "ghost" | "whatsapp";
  className?: string;
}) {
  if (cobradoEm) {
    return (
      <button
        type="button"
        disabled
        className={cx(
          "inline-flex w-full items-center justify-center rounded-xl border border-accent-strong bg-transparent px-4 py-2.5 text-sm font-semibold text-accent disabled:cursor-not-allowed",
          className
        )}
      >
        ✓ {horaCurta(cobradoEm)}
      </button>
    );
  }

  return (
    <Link href={`/clientes/${clienteId}/cobranca`} className={className}>
      <Button variant={variant} className="w-full whitespace-nowrap">
        {label}
      </Button>
    </Link>
  );
}
