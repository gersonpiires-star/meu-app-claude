"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";

export function NovoProdutoForm({ acao }: { acao: (formData: FormData) => Promise<{ ok: false; erro: string } | void> }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return <Button onClick={() => setAberto(true)}>+ Novo produto</Button>;
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface p-4"
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
      <p className="text-sm font-bold text-text">Novo produto</p>
      <Field label="Modelo">
        <Input name="modelo" required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Custo pago / un.">
          <Input type="number" name="custoUnitario" min={0} step="0.01" defaultValue={0} />
        </Field>
        <Field label="Estoque mín.">
          <Input type="number" name="estoqueMinimo" min={0} defaultValue={1} />
        </Field>
      </div>
      <Field label="Quantidade / total pago">
        <Input type="number" name="quantidade" min={0} defaultValue={0} />
      </Field>
      {erro ? <p className="text-xs font-semibold text-danger">{erro}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Adicionar ao estoque"}
        </Button>
      </div>
    </form>
  );
}
