"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { linkWhatsApp } from "@/lib/mensagens";

export function LinkPagamento({ clienteId, whatsapp }: { clienteId: string; whatsapp: string | null }) {
  const [copiado, setCopiado] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    // window.location só existe no cliente — setar aqui (e não no useState
    // inicial) é o jeito de evitar mismatch de hidratação nesse valor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(`${window.location.origin}/pagar/${clienteId}`);
  }, [clienteId]);

  if (!url) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-strong p-3">
      <p className="text-xs text-text-dim">
        Link permanente — o cliente abre e paga sozinho com Pix ou cartão sempre que quiser.
      </p>
      <p className="truncate text-xs text-text-dim">{url}</p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? "Copiado!" : "Copiar link"}
        </Button>
        {whatsapp ? (
          <a
            href={linkWhatsApp(whatsapp, `Segue o link para pagar sua renovação com Pix ou cartão:\n${url}`)}
            target="_blank"
            rel="noreferrer"
            className="flex-1"
          >
            <Button variant="whatsapp" className="w-full">
              Enviar por WhatsApp
            </Button>
          </a>
        ) : null}
      </div>
    </div>
  );
}
