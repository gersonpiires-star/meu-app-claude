"use client";

import { useTransition } from "react";

export function DispensarOnboardingBotao({ acao }: { acao: () => Promise<void> }) {
  const [pendente, iniciarTransicao] = useTransition();
  return (
    <button
      type="button"
      aria-label="Não mostrar mais"
      title="Não mostrar mais"
      disabled={pendente}
      onClick={() => iniciarTransicao(acao)}
      className="rounded-lg p-1 text-text-dim hover:bg-surface-2 hover:text-text disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
