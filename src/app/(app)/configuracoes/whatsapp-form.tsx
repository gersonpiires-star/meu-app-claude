"use client";

import { useRef, useState, useTransition } from "react";
import { Badge, Button, Field, Input } from "@/components/ui";
import { salvarCredenciaisWhatsapp, removerCredenciaisWhatsapp, alternarBotWhatsapp } from "./actions";
import { dataCurta } from "@/lib/format";

export function WhatsappForm({
  telefoneNumeroId,
  botAtivo,
  conectadoEm,
}: {
  telefoneNumeroId: string | null;
  botAtivo: boolean;
  conectadoEm: Date | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const [alternando, iniciarAlternancia] = useTransition();
  const [removendo, iniciarRemocao] = useTransition();

  const conectado = Boolean(telefoneNumeroId);

  function salvar(formData: FormData) {
    iniciarTransicao(async () => {
      const resposta = await salvarCredenciaisWhatsapp(formData);
      if ("ok" in resposta) {
        setResultado({ ok: true, texto: "Conectado! O autoatendimento já está ativo." });
        formRef.current?.reset();
      } else {
        setResultado({ ok: false, texto: resposta.erro });
      }
    });
  }

  function alternar() {
    iniciarAlternancia(async () => {
      await alternarBotWhatsapp(!botAtivo);
      setResultado(null);
    });
  }

  function remover() {
    iniciarRemocao(async () => {
      await removerCredenciaisWhatsapp();
      setResultado(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {conectado ? (
        <div className="flex items-center justify-between rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-semibold text-text">Número conectado</p>
            <p className="text-xs text-text-dim">
              {conectadoEm ? `Conectado em ${dataCurta(conectadoEm)}` : "Conectado"}
            </p>
          </div>
          <Badge tone={botAtivo ? "accent" : "warning"}>{botAtivo ? "Ativo" : "Pausado"}</Badge>
        </div>
      ) : null}

      {resultado ? (
        <p className={`whitespace-pre-line text-sm ${resultado.ok ? "text-accent" : "text-danger"}`}>{resultado.texto}</p>
      ) : null}

      {conectado ? (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={alternar} disabled={alternando} className="flex-1">
            {alternando ? "Aguarde…" : botAtivo ? "Pausar atendimento" : "Reativar atendimento"}
          </Button>
          <Button type="button" variant="danger" onClick={remover} disabled={removendo} className="flex-1">
            {removendo ? "Removendo…" : "Desconectar"}
          </Button>
        </div>
      ) : (
        <form ref={formRef} action={salvar} className="flex flex-col gap-3">
          <Field label="Phone Number ID">
            <Input name="whatsappTelefoneNumeroId" autoComplete="off" required />
          </Field>
          <Field label="Token de acesso permanente">
            <Input type="password" name="whatsappToken" autoComplete="off" required />
          </Field>
          <Button type="submit" disabled={pendente} className="w-full">
            {pendente ? "Conectando…" : "Conectar número"}
          </Button>
        </form>
      )}
    </div>
  );
}
