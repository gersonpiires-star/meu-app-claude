"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";

export function NovoAppForm({ acao }: { acao: (formData: FormData) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <Button variant="ghost" className="w-full" onClick={() => setAberto(true)}>
        + App
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong p-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          await acao(formData);
          setAberto(false);
        })
      }
    >
      <p className="text-sm font-bold text-text">Novo app nessa plataforma</p>
      <Field label="Nome do app">
        <Input name="nome" placeholder="Ex: UniTv" required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Crédito (R$)">
          <Input type="number" name="custoCredito" min={0.01} step="0.01" required />
        </Field>
        <Field label="Tela extra (R$)">
          <Input type="number" name="cobrancaTelaExtra" min={0} step="0.01" />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}
