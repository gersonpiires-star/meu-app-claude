"use client";

import { useTransition } from "react";
import { cx } from "@/components/ui";
import { alternarDestaqueSugestao } from "../actions";

export function SugestaoDestaqueBotao({ id, destaque }: { id: string; destaque: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciarTransicao(() => alternarDestaqueSugestao(id, !destaque))}
      className={cx(
        "text-xs font-semibold hover:underline disabled:opacity-50",
        destaque ? "text-warning" : "text-text-dim"
      )}
    >
      {pendente ? "…" : destaque ? "★ Remover destaque" : "☆ Marcar pra implementar"}
    </button>
  );
}
