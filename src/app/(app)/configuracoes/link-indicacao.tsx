"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export function LinkIndicacao({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível (http sem TLS, permissão negada) — o link já
      // está selecionável no campo, então dá pra copiar manualmente.
    }
  }

  return (
    <div className="flex gap-2">
      <Input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 text-xs" />
      <Button type="button" variant="ghost" onClick={copiar} className="shrink-0">
        {copiado ? "Copiado!" : "Copiar"}
      </Button>
    </div>
  );
}
