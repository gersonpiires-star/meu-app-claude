"use client";

import { useState } from "react";

export function CampoArquivo({ name, accept, required }: { name: string; accept?: string; required?: boolean }) {
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);

  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong px-4 py-3 text-center text-sm font-semibold text-text transition hover:bg-surface-2">
      <span className="truncate">{nomeArquivo ?? "Escolher arquivo…"}</span>
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        className="hidden"
        onChange={(e) => setNomeArquivo(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}
