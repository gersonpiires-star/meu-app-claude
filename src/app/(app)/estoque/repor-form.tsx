"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";

export function ReporForm({ acao }: { acao: (formData: FormData) => Promise<{ ok: false; erro: string } | void> }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
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
      className="flex flex-wrap items-center gap-2"
      action={(formData) =>
        iniciarTransicao(async () => {
          setErro(null);
          const resultado = await acao(formData);
          if (resultado?.ok === false) {
            setErro(resultado.erro);
            return;
          }
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
      <Input name="fornecedor" placeholder="Fornecedor (opcional)" className="w-40" />
      <Button type="submit" disabled={pendente} className="whitespace-nowrap">
        {pendente ? "…" : "Adicionar"}
      </Button>
      {erro ? <p className="w-full text-xs font-semibold text-danger">{erro}</p> : null}
    </form>
  );
}
