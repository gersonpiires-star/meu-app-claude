"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";

export function ExcluirBotao({ acao }: { acao: () => Promise<void> }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Button
      variant="danger"
      disabled={pendente}
      onClick={() => {
        if (confirm("Excluir este cliente? Essa ação não pode ser desfeita.")) {
          iniciarTransicao(acao);
        }
      }}
    >
      Excluir
    </Button>
  );
}
