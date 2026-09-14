"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { pedirRecuperacaoSenha } from "./actions";

export function RecuperarForm() {
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (enviado) {
    return (
      <p className="text-sm text-text-muted">
        Se existir uma conta com esse e-mail, mandamos um link de recuperação — confira sua caixa de entrada
        (e o spam). O link vale por 1 hora.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setErro(null);
        iniciarTransicao(async () => {
          const resultado = await pedirRecuperacaoSenha(formData);
          if (resultado.ok) setEnviado(true);
          else setErro(resultado.erro);
        });
      }}
    >
      <Field label="E-mail">
        <Input type="email" name="email" autoComplete="email" required />
      </Field>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
