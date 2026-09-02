"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { criarPlataforma } from "./actions";

export function NovaPlataformaForm() {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return <Button onClick={() => setAberto(true)}>+ Nova plataforma</Button>;
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface p-4"
      action={(formData) =>
        iniciarTransicao(async () => {
          await criarPlataforma(formData);
          setAberto(false);
        })
      }
    >
      <p className="text-sm font-bold text-text">Nova plataforma</p>
      <Field label="Nome do fornecedor">
        <Input name="nome" placeholder="Ex: Fornecedor A" required autoFocus />
      </Field>
      <Field label="Avisar abaixo de">
        <Input type="number" name="minimo" min={0} defaultValue={5} />
      </Field>
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
