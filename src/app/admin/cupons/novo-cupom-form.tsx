"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { criarCupom } from "./actions";

export function NovoCupomForm() {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (!aberto) {
    return <Button onClick={() => setAberto(true)}>+ Novo cupom</Button>;
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-border-strong bg-surface p-4"
      action={(formData) =>
        iniciarTransicao(async () => {
          setErro(null);
          const resultado = await criarCupom(formData);
          if (resultado.ok) {
            setAberto(false);
          } else {
            setErro(resultado.erro);
          }
        })
      }
    >
      <p className="text-sm font-bold text-text">Novo cupom</p>
      <Field label="Código">
        <Input name="codigo" placeholder="Ex: BLACKFRIDAY30" required autoFocus style={{ textTransform: "uppercase" }} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de desconto">
          <Select name="tipo" defaultValue="PERCENTUAL">
            <option value="PERCENTUAL">Percentual (%)</option>
            <option value="FIXO">Valor fixo (R$)</option>
          </Select>
        </Field>
        <Field label="Valor do desconto">
          <Input type="number" name="valor" min={0.01} step="0.01" placeholder="Ex: 30" required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Válido até (opcional)">
          <Input type="date" name="validoAte" />
        </Field>
        <Field label="Limite de usos (opcional)">
          <Input type="number" name="usoMaximo" min={1} placeholder="Sem limite" />
        </Field>
      </div>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Criando…" : "Criar cupom"}
        </Button>
      </div>
    </form>
  );
}
