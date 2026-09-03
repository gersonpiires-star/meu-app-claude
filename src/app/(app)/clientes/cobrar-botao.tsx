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
