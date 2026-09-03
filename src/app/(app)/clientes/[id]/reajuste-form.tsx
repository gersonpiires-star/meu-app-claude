"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { brl } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";
import type { PlanoCliente } from "@/generated/prisma/enums";

export function ReajusteForm({
  plano,
  valorAtual,
  acao,
  podeEditar = true,
}: {
  plano: PlanoCliente;
  valorAtual: number;
  acao: (formData: FormData) => Promise<void>;
  podeEditar?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [novoValor, setNovoValor] = useState(valorAtual);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Plano</p>
        {podeEditar && !aberto ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-accent hover:underline"
            onClick={() => setAberto(true)}
          >
            Aplicar reajuste
          </button>
        ) : null}
      </div>

      {!aberto ? (
        <p className="mt-0.5 font-semibold text-text">
          {PLANO_LABEL[plano]} · {brl(valorAtual)}
        </p>
      ) : (
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
      )}
    </div>
  );
}
