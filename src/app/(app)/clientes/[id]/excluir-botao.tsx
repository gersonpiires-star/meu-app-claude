"use client";

import { useTransition } from "react";

export function ExcluirBotao({ acao }: { acao: () => Promise<void> }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
      onClick={() => {
        if (confirm("Excluir este cliente? Essa ação não pode ser desfeita.")) {
          iniciarTransicao(acao);
        }
      }}
    >
      {pendente ? "Excluindo…" : "Excluir"}
    </button>
  );
}
