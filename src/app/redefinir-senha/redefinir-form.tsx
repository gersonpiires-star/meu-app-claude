"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Field, Input, buttonClassName } from "@/components/ui";
import { redefinirSenha } from "./actions";

export function RedefinirForm({ token }: { token: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (ok) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-text-muted">Senha redefinida com sucesso!</p>
        <Link href="/entrar" className={buttonClassName("primary", "w-full")}>
          Entrar agora
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) => {
        setErro(null);
        iniciarTransicao(async () => {
          const resultado = await redefinirSenha(formData);
          if (resultado.ok) setOk(true);
          else setErro(resultado.erro);
        });
      }}
    >
      <input type="hidden" name="token" value={token} />
      <Field label="Nova senha">
        <Input type="password" name="senha" autoComplete="new-password" required />
      </Field>
      <Field label="Confirmar nova senha">
        <Input type="password" name="confirmarSenha" autoComplete="new-password" required />
      </Field>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? "Salvando…" : "Redefinir senha"}
      </Button>
    </form>
  );
}
