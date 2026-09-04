"use client";

import { useTransition } from "react";
import { excluirAviso } from "../actions";

export function ExcluirAvisoBotao({ id }: { id: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => {
        if (confirm("Excluir este comunicado? Ele some do sininho de todo mundo.")) {
          iniciarTransicao(() => excluirAviso(id));
        }
      }}
      className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
    >
      {pendente ? "Excluindo…" : "Excluir"}
    </button>
  );
}
