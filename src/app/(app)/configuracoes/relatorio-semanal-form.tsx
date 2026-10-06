"use client";

import { useState, useTransition } from "react";
import { Button, Switch } from "@/components/ui";
import { salvarRelatorioSemanal } from "./actions";

export function RelatorioSemanalForm({ ativo }: { ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [salvo, setSalvo] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) =>
        iniciarTransicao(async () => {
          await salvarRelatorioSemanal(formData);
          setSalvo(true);
        })
      }
    >
      <Switch
        name="relatorioSemanalAtivo"
        defaultChecked={ativo}
        label="Resumo semanal por e-mail"
        sub="Toda segunda, um resumo dos últimos 7 dias (receita, lucro, novos clientes)"
      />
      {salvo ? <p className="text-sm text-accent">Preferência salva.</p> : null}
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
