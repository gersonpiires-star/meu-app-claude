"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { converterTeste } from "../actions";

export function ConverterTesteBotao({ clienteId, nome }: { clienteId: string; nome: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <Button
        className="w-full"
        disabled={pendente}
        onClick={() => {
          if (!window.confirm(`${nome} sai do teste e passa a Mensal, com vencimento em 31 dias. Confirmar?`)) return;
          setErro(null);
          iniciarTransicao(async () => {
            const resultado = await converterTeste(clienteId);
            if (!resultado.ok) setErro(resultado.erro);
          });
        }}
      >
        {pendente ? "Convertendo…" : "Virar cliente pagante"}
      </Button>
      {erro ? <p className="text-xs font-semibold text-danger">{erro}</p> : null}
    </div>
  );
}
