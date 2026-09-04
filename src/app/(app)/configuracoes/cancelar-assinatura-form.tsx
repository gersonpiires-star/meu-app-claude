"use client";

import { useState, useTransition } from "react";
import { Button, Field, Textarea } from "@/components/ui";
import { cancelarAssinatura } from "./actions";

export function CancelarAssinaturaForm() {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <button type="button" className="text-xs font-semibold text-text-dim hover:text-danger" onClick={() => setAberto(true)}>
        Cancelar minha assinatura
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-bg/30 p-3"
      action={(formData) => {
        if (!confirm("Cancelar sua assinatura do GestorPro? Seu acesso é bloqueado até você assinar de novo.")) return;
        iniciarTransicao(() => cancelarAssinatura(formData));
      }}
    >
      <p className="text-xs font-semibold text-danger">
        Seu acesso ao app fica bloqueado até você assinar de novo — seus dados continuam guardados.
      </p>
      <Field label="Por que está cancelando? (opcional, nos ajuda a melhorar)">
        <Textarea name="motivo" placeholder="Achei caro, não usei o suficiente, troquei de sistema…" />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Voltar
        </Button>
        <Button type="submit" variant="danger" disabled={pendente} className="flex-1">
          {pendente ? "Cancelando…" : "Cancelar assinatura"}
        </Button>
      </div>
    </form>
  );
}
