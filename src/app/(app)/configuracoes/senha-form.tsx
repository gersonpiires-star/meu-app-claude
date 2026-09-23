"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { trocarSenha } from "./actions";

export function SenhaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          const resposta = await trocarSenha(formData);
          if ("ok" in resposta) {
            setResultado({ ok: true, texto: "Senha alterada." });
            formRef.current?.reset();
          } else {
            setResultado({ ok: false, texto: resposta.erro });
          }
        })
      }
    >
      <Field label="Senha atual">
        <Input type="password" name="senhaAtual" autoComplete="current-password" required />
      </Field>
      <Field label="Nova senha">
        <Input type="password" name="novaSenha" autoComplete="new-password" required minLength={6} />
      </Field>
      <Field label="Confirmar nova senha">
        <Input type="password" name="confirmarSenha" autoComplete="new-password" required minLength={6} />
      </Field>
      {resultado ? (
        <p className={resultado.ok ? "text-sm text-accent" : "text-sm text-danger"}>{resultado.texto}</p>
      ) : null}
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando…" : "Trocar senha"}
      </Button>
    </form>
  );
}
