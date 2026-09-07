"use client";

import { useTransition } from "react";
import { marcarSugestaoLida } from "./actions";

export function MarcarSugestaoLidaBotao({ id }: { id: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciarTransicao(() => marcarSugestaoLida(id))}
      className="text-xs font-semibold text-accent hover:underline disabled:opacity-50"
    >
      {pendente ? "Marcando…" : "Marcar como lida"}
    </button>
  );
}
