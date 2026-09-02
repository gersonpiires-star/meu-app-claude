"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { brl } from "@/lib/format";

export function ReajusteForm({
  valorAtual,
  acao,
}: {
  valorAtual: number;
  acao: (formData: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [novoValor, setNovoValor] = useState(valorAtual);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <button type="button" className="text-[11px] font-semibold text-accent hover:underline" onClick={() => setAberto(true)}>
        Aplicar reajuste
      </button>
    );
  }

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
        type="number"
        name="novoValor"
        min={0}
        step="0.01"
        value={novoValor}
        onChange={(e) => setNovoValor(Number(e.target.value))}
      />
      <p className="text-xs text-text-dim">
        Era {brl(valorAtual)} → fica {brl(novoValor)}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Continuar"}
        </Button>
      </div>
    </form>
  );
}
