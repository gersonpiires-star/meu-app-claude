"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { gerarLinkPagamentoPublico } from "./actions";

export function PagarBotao({ clienteId }: { clienteId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function pagar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await gerarLinkPagamentoPublico(clienteId);
      if ("erro" in resultado) {
        setErro(resultado.erro);
        return;
      }
      window.location.href = resultado.url;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={pagar} disabled={pendente} className="w-full">
        {pendente ? "Abrindo pagamento…" : "Pagar agora com Pix ou cartão"}
      </Button>
      {erro ? <p className="text-center text-xs text-danger">{erro}</p> : null}
    </div>
  );
}
