"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { PLANO_LABEL, PLANO_VALOR_SUGERIDO } from "@/lib/planos";
import type { PlanoCliente } from "@/generated/prisma/enums";

const PLANOS: PlanoCliente[] = ["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"];

export function RenovarForm({
  acao,
  planoAtual,
  valorAtual,
}: {
  acao: (formData: FormData) => Promise<void>;
  planoAtual: PlanoCliente;
  valorAtual: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [plano, setPlano] = useState<PlanoCliente>(planoAtual);
  const [valor, setValor] = useState(valorAtual);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return (
      <Button className="w-full" onClick={() => setAberto(true)}>
        Renovar
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
        O vencimento é calculado pelo plano
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plano">
          <Select
            name="plano"
            value={plano}
            onChange={(e) => {
              const novo = e.target.value as PlanoCliente;
              setPlano(novo);
              setValor(PLANO_VALOR_SUGERIDO[novo]);
            }}
          >
            {PLANOS.map((p) => (
              <option key={p} value={p}>
                {PLANO_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor (R$)">
          <Input
            type="number"
            name="valor"
            min={0}
            step="0.01"
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            required
          />
        </Field>
      </div>
      <Field label="Custo (créditos gastos)">
        <Input type="number" name="custo" min={0} step="0.01" defaultValue={0} />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : "Confirmar renovação"}
        </Button>
      </div>
    </form>
  );
}
