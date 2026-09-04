"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { criarInteressado } from "../actions";

export function NovoInteressadoForm() {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return <Button onClick={() => setAberto(true)}>+ Novo interessado</Button>;
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface p-4"
      action={(formData) =>
        iniciarTransicao(async () => {
          await criarInteressado(formData);
          setAberto(false);
        })
      }
    >
      <p className="text-sm font-bold text-text">Quem chamou?</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome">
          <Input name="nome" required autoFocus />
        </Field>
        <Field label="WhatsApp">
          <Input name="whatsapp" inputMode="tel" required />
        </Field>
      </div>
      <Field label="Interesse">
        <Input name="interesse" placeholder="Ex: quer revender streaming" />
      </Field>
      <Field label="Retornar em (DD/MM/AAAA)">
        <Input type="date" name="retornarEm" />
      </Field>
      <Field label="Observação">
        <Textarea name="observacao" />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
