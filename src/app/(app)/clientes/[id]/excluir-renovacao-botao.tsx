"use client";

import { useState, useTransition } from "react";
import { excluirRenovacao } from "../actions";

export function ExcluirRenovacaoBotao({ id }: { id: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          if (
            confirm(
              "Excluir essa renovação? Se for a mais recente do cliente, ele volta pro plano/valor/vencimento de antes dela. Caso contrário, só o registro é removido (sem mexer na data de vencimento). Essa ação não pode ser desfeita."
            )
          ) {
            setErro(null);
            iniciarTransicao(async () => {
              const resultado = await excluirRenovacao(id);
              if (!resultado.ok) {
                setErro(resultado.erro);
              } else if (!resultado.restaurado) {
                alert("Renovação excluída. O vencimento do cliente NÃO foi ajustado automaticamente — confira e corrija se precisar.");
              }
            });
          }
        }}
        className="shrink-0 text-[11px] font-semibold text-danger hover:underline disabled:opacity-50"
      >
        {pendente ? "Excluindo…" : "Excluir"}
      </button>
      {erro ? <p className="max-w-[180px] text-right text-[10px] text-danger">{erro}</p> : null}
    </div>
  );
}
