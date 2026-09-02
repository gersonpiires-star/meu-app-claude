"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";

export function ReporForm({ acao }: { acao: (formData: FormData) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <Button variant="ghost" onClick={() => setAberto(true)}>
        + Repor
      </Button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      action={(formData) =>
        iniciarTransicao(async () => {
          await acao(formData);
          setAberto(false);
        })
      }
    >
      <Input type="number" name="quantidade" min={1} placeholder="Qtd" required className="w-16" />
      <Input
        type="number"
        name="custoUnitario"
        min={0}
        step="0.01"
        placeholder="Custo/un. (R$)"
        required
        className="w-28"
      />
      <Button type="submit" disabled={pendente} className="whitespace-nowrap">
        {pendente ? "…" : "Adicionar"}
      </Button>
    </form>
  );
}
