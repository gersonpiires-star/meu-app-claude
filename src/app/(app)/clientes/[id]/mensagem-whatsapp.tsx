"use client";

import { useMemo, useState } from "react";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { linkWhatsApp, MODELOS_COBRANCA, MODELOS_COMUNICADO, preencherModelo } from "@/lib/mensagens";

const MODELOS = { ...MODELOS_COBRANCA, ...MODELOS_COMUNICADO };

export function MensagemWhatsApp({
  whatsapp,
  dados,
}: {
  whatsapp: string | null;
  dados: Record<string, string>;
}) {
  const [modelo, setModelo] = useState(Object.keys(MODELOS)[0]);
  const texto = useMemo(() => preencherModelo(MODELOS[modelo] ?? "", dados), [modelo, dados]);
  const [mensagem, setMensagem] = useState(texto);

  if (!whatsapp) {
    return <p className="text-sm text-text-dim">Cadastre o WhatsApp do cliente para enviar mensagens.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Modelo de mensagem">
        <Select
          value={modelo}
          onChange={(e) => {
            setModelo(e.target.value);
            setMensagem(preencherModelo(MODELOS[e.target.value] ?? "", dados));
          }}
        >
          {Object.keys(MODELOS).map((chave) => (
            <option key={chave} value={chave}>
              {chave}
            </option>
          ))}
        </Select>
      </Field>
      <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="min-h-40" />
      <a href={linkWhatsApp(whatsapp, mensagem)} target="_blank" rel="noreferrer">
        <Button variant="whatsapp" className="w-full">
          Avisar cliente no WhatsApp
        </Button>
      </a>
    </div>
  );
}
