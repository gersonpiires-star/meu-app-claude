"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";

type AcaoAjuste = (formData: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>;

export function AjustarSaldoForm({ saldoAtual, acao }: { saldoAtual: number; acao: AcaoAjuste }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-semibold text-text-dim hover:text-text"
      >
        Ajustar saldo
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-2 p-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          const resposta = await acao(formData);
          if (resposta.ok) {
            setAberto(false);
            setErro(null);
          } else {
            setErro(resposta.erro);
          }
        })
      }
    >
      <Field label={`Saldo atual: ${saldoAtual} — qual é o certo?`}>
        <Input type="number" name="novoSaldo" min={0} step="1" defaultValue={saldoAtual} required />
      </Field>
      {erro ? <p className="text-xs font-semibold text-danger">{erro}</p> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
