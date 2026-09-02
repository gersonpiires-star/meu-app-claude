"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { salvarModeloMensagem, restaurarModeloPadrao } from "./actions";

export function ModeloItem({
  chave,
  textoAtual,
  personalizado,
}: {
  chave: string;
  textoAtual: string;
  personalizado: boolean;
}) {
  const [texto, setTexto] = useState(textoAtual);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4 last:border-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text">{chave}</p>
        {personalizado ? (
          <button
            type="button"
            className="text-xs font-semibold text-text-dim hover:text-danger"
            disabled={pendente}
            onClick={() => iniciarTransicao(() => restaurarModeloPadrao(chave))}
          >
            Voltar ao padrão
          </button>
        ) : null}
      </div>
      <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="min-h-32" />
      <Button
        variant="ghost"
        className="self-start"
        disabled={pendente || texto === textoAtual}
        onClick={() =>
          iniciarTransicao(async () => {
            const formData = new FormData();
            formData.set("texto", texto);
            await salvarModeloMensagem(chave, formData);
          })
        }
      >
        {pendente ? "Salvando…" : "Salvar modelo"}
      </Button>
    </div>
  );
}
