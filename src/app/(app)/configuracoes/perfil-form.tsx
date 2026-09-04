"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { salvarPerfil } from "./actions";

export function PerfilForm({ nome, whatsapp }: { nome: string; whatsapp: string }) {
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          const resposta = await salvarPerfil(formData);
          setResultado(resposta?.erro ? { ok: false, texto: resposta.erro } : { ok: true, texto: "Dados salvos." });
        })
      }
    >
      <Field label="Seu nome">
        <Input name="nome" defaultValue={nome} required />
      </Field>
      <Field label="WhatsApp">
        <Input name="whatsapp" defaultValue={whatsapp} placeholder="47 99999-9999" inputMode="tel" required />
      </Field>
      <p className="-mt-1 text-[11px] text-text-dim">
        Esse é o número que aparece pros seus clientes nos recibos e mensagens automáticas.
      </p>
      {resultado ? (
        <p className={resultado.ok ? "text-sm text-accent" : "text-sm text-danger"}>{resultado.texto}</p>
      ) : null}
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
