"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function PixCopiaCola({ qrCodeDataUrl, payload }: { qrCodeDataUrl: string; payload: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(payload);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerado no servidor, não é um asset otimizável pelo next/image */}
      <img src={qrCodeDataUrl} alt="QR Code Pix" className="h-40 w-40 rounded-lg border border-border-strong bg-white p-1.5" />
      <Button type="button" variant="ghost" onClick={copiar} className="w-full">
        {copiado ? "Copiado!" : "Copiar código Pix"}
      </Button>
    </div>
  );
}
