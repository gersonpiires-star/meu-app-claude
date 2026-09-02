"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { dataCurta } from "@/lib/format";

function paraDDMMAAAA(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function CorrigirVencimento({
  vencimentoAtual,
  acao,
}: {
  vencimentoAtual: Date;
  acao: (formData: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [novoTexto, setNovoTexto] = useState(paraDDMMAAAA(vencimentoAtual));
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <button
        type="button"
        className="text-[11px] font-semibold text-accent hover:underline"
        onClick={() => setAberto(true)}
      >
        Corrigir
      </button>
    );
  }

  const mudou = novoTexto !== paraDDMMAAAA(vencimentoAtual);

  return (
    <form
      className="mt-2 flex flex-col gap-2"
      action={(formData) =>
        iniciarTransicao(async () => {
          await acao(formData);
          setAberto(false);
        })
      }
    >
      <Input
        name="vencimento"
        value={novoTexto}
        onChange={(e) => setNovoTexto(e.target.value)}
        placeholder="DD/MM/AAAA"
        className="text-sm"
      />
      {mudou ? (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">
          Alterações pendentes — era {dataCurta(vencimentoAtual)}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Voltar
        </Button>
        <Button type="submit" disabled={pendente || !mudou} className="flex-1">
          {pendente ? "Salvando…" : "Confirmar alteração"}
        </Button>
      </div>
    </form>
  );
}
