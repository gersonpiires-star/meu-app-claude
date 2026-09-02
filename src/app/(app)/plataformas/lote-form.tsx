"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";

export function LoteForm({ acao }: { acao: (formData: FormData) => Promise<void> }) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <Button variant="ghost" onClick={() => setAberto(true)}>
        + Lote
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
      <Input type="number" name="quantidade" min={1} placeholder="Quantos" required className="w-20" />
      <Input type="number" name="valorPago" min={0} step="0.01" placeholder="Total pago (R$)" required className="w-32" />
      <Button type="submit" disabled={pendente} className="whitespace-nowrap">
        {pendente ? "…" : "Adicionar ao saldo"}
      </Button>
    </form>
  );
}
