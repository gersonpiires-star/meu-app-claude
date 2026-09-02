"use client";

import { useState, useTransition } from "react";
import { Button, Field, Textarea } from "@/components/ui";

export function CancelarForm({ acao }: { acao: (formData: FormData) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <button
        type="button"
        className="text-xs font-semibold text-text-dim hover:text-danger"
        onClick={() => setAberto(true)}
      >
        Cancelar cliente
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-bg/40 p-3"
      action={(formData) => iniciarTransicao(() => acao(formData))}
    >
      <p className="text-xs font-semibold text-danger">‹ Cancelar cliente</p>
      <Field label="Motivo da saída">
        <Textarea name="motivo" placeholder="Ex: trocou de fornecedor, parou de usar…" />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Voltar
        </Button>
        <Button type="submit" variant="danger" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Confirmar cancelamento"}
        </Button>
      </div>
    </form>
  );
}
