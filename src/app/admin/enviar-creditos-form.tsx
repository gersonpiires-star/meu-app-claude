"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";
import { enviarCreditos } from "./actions";

export function EnviarCreditosForm({ contas }: { contas: { id: string; nome: string }[] }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          setErro(null);
          setSucesso(false);
          const resultado = await enviarCreditos(formData);
          if (resultado?.erro) setErro(resultado.erro);
          else {
            setSucesso(true);
            (document.getElementById("form-enviar-creditos") as HTMLFormElement | null)?.reset();
          }
        })
      }
      id="form-enviar-creditos"
    >
      <Field label="Conta">
        <Select name="revendedorId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Quantidade (R$)">
        <Input type="number" name="quantidade" step="0.01" required placeholder="Ex: 20" />
      </Field>
      <Field label="Observação">
        <Input name="observacao" placeholder="Opcional" />
      </Field>
      {erro ? <p className="text-xs font-semibold text-danger">{erro}</p> : null}
      {sucesso ? <p className="text-xs font-semibold text-accent">Crédito enviado.</p> : null}
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Enviando…" : "Enviar créditos"}
      </Button>
    </form>
  );
}
