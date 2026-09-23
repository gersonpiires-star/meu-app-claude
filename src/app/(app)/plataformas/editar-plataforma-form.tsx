"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";

export function EditarPlataformaForm({
  plataforma,
  acao,
}: {
  plataforma: { nome: string; url: string | null; minimo: number };
  acao: (formData: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-semibold text-text-dim hover:text-text"
      >
        Editar
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface-2 p-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          await acao(formData);
          setAberto(false);
        })
      }
    >
      <Field label="Nome do fornecedor">
        <Input name="nome" defaultValue={plataforma.nome} required />
      </Field>
      <Field label="Link do painel">
        <Input name="url" type="url" defaultValue={plataforma.url ?? ""} placeholder="https://painel.exemplo.com" />
      </Field>
      <Field label="Avisar abaixo de">
        <Input type="number" name="minimo" min={0} defaultValue={plataforma.minimo} />
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
