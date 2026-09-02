"use client";

import { useTransition } from "react";
import { marcarConvertido, excluirInteressado } from "../actions";

export function InteressadoAcoes({ id }: { id: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex gap-3 text-xs font-semibold">
      <button
        disabled={pendente}
        className="text-accent hover:brightness-110"
        onClick={() => iniciarTransicao(() => marcarConvertido(id))}
      >
        Virou cliente
      </button>
      <button
        disabled={pendente}
        className="text-text-dim hover:text-danger"
        onClick={() => {
          if (confirm("Remover este interessado?")) iniciarTransicao(() => excluirInteressado(id));
        }}
      >
        Remover
      </button>
    </div>
  );
}
