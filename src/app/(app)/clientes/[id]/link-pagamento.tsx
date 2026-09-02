"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { linkWhatsApp } from "@/lib/mensagens";
import { gerarLinkPagamentoCliente } from "./pagamento-actions";

export function LinkPagamento({ clienteId, whatsapp }: { clienteId: string; whatsapp: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function gerar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await gerarLinkPagamentoCliente(clienteId);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      setUrl(resultado.url);
    });
  }

  if (!url) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="ghost" disabled={pendente} onClick={gerar} className="w-full">
          {pendente ? "Gerando link…" : "Gerar link de pagamento (Pix/cartão)"}
        </Button>
        {erro ? <p className="text-xs text-danger">{erro}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-strong p-3">
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
