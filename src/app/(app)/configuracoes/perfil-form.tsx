"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { salvarPerfil } from "./actions";

export function PerfilForm({
  nome,
  whatsapp,
  nomeNegocio,
  cidade,
}: {
  nome: string;
  whatsapp: string;
  nomeNegocio: string | null;
  cidade: string | null;
}) {
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nome do negócio">
          <Input name="nomeNegocio" defaultValue={nomeNegocio ?? ""} placeholder="Ex: TV do Bairro" />
        </Field>
        <Field label="WhatsApp de atendimento">
          <Input name="whatsapp" defaultValue={whatsapp} placeholder="47 99999-9999" inputMode="tel" required />
        </Field>
        <Field label="Seu nome">
          <Input name="nome" defaultValue={nome} required />
        </Field>
        <Field label="Cidade">
          <Input name="cidade" defaultValue={cidade ?? ""} placeholder="Ex: São Paulo" />
        </Field>
      </div>
      <p className="-mt-1 text-[11px] text-text-dim">
        O WhatsApp é o número que aparece pros seus clientes nos recibos e mensagens automáticas.
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
