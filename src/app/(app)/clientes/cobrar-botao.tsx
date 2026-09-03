import Link from "next/link";
import { Button, cx } from "@/components/ui";

function horaCurta(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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
      <Button variant="ghost" disabled className={cx("w-full whitespace-nowrap", className)}>
        Já cobrado hoje · {horaCurta(cobradoEm)}
      </Button>
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
