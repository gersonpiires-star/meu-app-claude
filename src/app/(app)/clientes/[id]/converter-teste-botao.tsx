"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { converterTeste } from "../actions";

export function ConverterTesteBotao({ clienteId, nome }: { clienteId: string; nome: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pendente}
      onClick={() => {
        if (!window.confirm(`${nome} sai do teste e passa a Mensal, com vencimento em 31 dias. Confirmar?`)) return;
        iniciarTransicao(() => converterTeste(clienteId));
      }}
    >
      {pendente ? "Convertendo…" : "Virar cliente pagante"}
    </Button>
  );
}
