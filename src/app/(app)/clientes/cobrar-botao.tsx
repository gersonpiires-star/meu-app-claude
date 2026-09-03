import Link from "next/link";
import { Button, buttonClassName, cx } from "@/components/ui";
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
      <Button variant="outline" disabled className={cx("w-full min-w-0 whitespace-nowrap", className)}>
        ✓ {horaCurta(cobradoEm)}
      </Button>
    );
  }

  return (
    <Link href={`/clientes/${clienteId}/cobranca`} className={buttonClassName(variant, cx("min-w-0 whitespace-nowrap", className))}>
      {label}
    </Link>
  );
}
