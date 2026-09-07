"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { enviarSugestao } from "./actions";

export function SugestaoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          const resposta = await enviarSugestao(formData);
          if (resposta.ok) {
            setResultado({ ok: true, texto: "Sugestão enviada — obrigado pela ajuda!" });
            formRef.current?.reset();
          } else {
            setResultado({ ok: false, texto: resposta.erro });
          }
        })
      }
    >
      <Textarea name="mensagem" placeholder="O que você acha que poderia melhorar ou ajustar no GestorPro?" required />
      {resultado ? <p className={resultado.ok ? "text-sm text-accent" : "text-sm text-danger"}>{resultado.texto}</p> : null}
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Enviando…" : "Enviar sugestão"}
      </Button>
    </form>
  );
}
