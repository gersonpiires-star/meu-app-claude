"use client";

import { useTransition } from "react";
import { excluirCupom } from "./actions";

export function ExcluirCupomBotao({ id, codigo }: { id: string; codigo: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (confirm(`Excluir o cupom ${codigo} definitivamente? Essa ação não pode ser desfeita.`)) {
          iniciarTransicao(() => excluirCupom(id));
        }
      }}
      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
    >
      {pendente ? "Excluindo…" : "Excluir"}
    </button>
  );
}
