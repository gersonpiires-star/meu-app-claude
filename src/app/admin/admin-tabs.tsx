"use client";

import { useState } from "react";
import { cx } from "@/components/ui";

export function AdminTabs({
  abas,
}: {
  abas: { id: string; label: string; conteudo: React.ReactNode }[];
}) {
  const [ativa, setAtiva] = useState(abas[0].id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex w-fit flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAtiva(a.id)}
            className={cx(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              ativa === a.id
                ? "bg-accent-soft text-accent"
                : "text-text-dim hover:text-text",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {abas.map((a) => (
        <div
          key={a.id}
          className={a.id === ativa ? "flex flex-col gap-6" : "hidden"}
        >
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}
