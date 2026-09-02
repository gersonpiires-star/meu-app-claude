"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { entrarComCredenciais } from "./actions";

export function LoginForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setErro(null);
        iniciarTransicao(async () => {
          const resultado = await entrarComCredenciais(formData);
          if (resultado?.error) setErro(resultado.error);
        });
      }}
    >
      <Field label="E-mail">
        <Input type="email" name="email" autoComplete="email" required />
      </Field>
      <Field label="Senha">
        <Input type="password" name="senha" autoComplete="current-password" required />
      </Field>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? "Entrando…" : "Entrar"}
      </Button>
      <a href="#" className="text-center text-xs text-text-dim hover:text-text-muted">
        Esqueci minha senha
      </a>
    </form>
  );
}
