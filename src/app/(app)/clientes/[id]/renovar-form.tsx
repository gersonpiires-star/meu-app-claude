"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { PLANO_LABEL, PLANO_MESES, PLANO_VALOR_SUGERIDO } from "@/lib/planos";
import type { PlanoCliente } from "@/generated/prisma/enums";

const PLANOS: PlanoCliente[] = ["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"];

export function RenovarForm({
  acao,
  planoAtual,
  valorAtual,
  custoCredito,
}: {
  acao: (formData: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>;
  planoAtual: PlanoCliente;
  valorAtual: number;
  custoCredito: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [plano, setPlano] = useState<PlanoCliente>(planoAtual);
  const [valor, setValor] = useState(valorAtual);
  const [custo, setCusto] = useState(PLANO_MESES[planoAtual] * custoCredito);
  const [erro, setErro] = useState<string | null>(null);
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
          const resultado = await acao(formData);
          if (resultado.ok) {
            setAberto(false);
            setErro(null);
          } else {
            setErro(resultado.erro);
          }
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
              setCusto(PLANO_MESES[novo] * custoCredito);
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
      <Field label="Custo dos créditos (R$)">
        <Input
          type="number"
          name="custo"
          min={0}
          step="0.01"
          value={custo}
          onChange={(e) => setCusto(Number(e.target.value))}
        />
      </Field>
      {custoCredito === 0 ? (
        <p className="-mt-1 text-xs text-warning">
          Cadastre o valor do crédito desse app em Plataformas para calcular sozinho.
        </p>
      ) : null}
      {erro ? <p className="-mt-1 text-xs font-semibold text-danger">{erro}</p> : null}
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
