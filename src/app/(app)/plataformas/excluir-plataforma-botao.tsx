"use client";

import { useState, useTransition } from "react";
import { excluirPlataforma } from "./actions";

export function ExcluirPlataformaBotao({ id, nome }: { id: string; nome: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (confirm(`Excluir a plataforma ${nome}? Os lotes de compra dela somem junto. Essa ação não pode ser desfeita.`)) {
            setErro(null);
            iniciarTransicao(async () => {
              const resultado = await excluirPlataforma(id);
              if (!resultado.ok) setErro(resultado.erro);
            });
          }
        }}
        className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
      >
        {pendente ? "Excluindo…" : "Excluir"}
      </button>
      {erro ? <p className="max-w-[220px] text-right text-[11px] text-danger">{erro}</p> : null}
    </div>
  );
}
