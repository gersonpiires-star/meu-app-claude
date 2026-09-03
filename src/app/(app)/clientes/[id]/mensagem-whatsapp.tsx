"use client";

import { useState } from "react";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { preencherModelo } from "@/lib/mensagens";
import { RegistrarCobrancaLink } from "../../painel/registrar-cobranca-link";

export function MensagemWhatsApp({
  clienteId,
  whatsapp,
  dados,
  chaves = [],
  modelos,
}: {
  clienteId: string;
  whatsapp: string | null;
  dados: Record<string, string>;
  chaves?: { id: string; tipo: string; valor: string }[];
  modelos: Record<string, string>;
}) {
  const MODELOS = modelos;
  const [modelo, setModelo] = useState(Object.keys(MODELOS)[0]);
  const [mensagem, setMensagem] = useState(() => preencherModelo(MODELOS[Object.keys(MODELOS)[0]] ?? "", dados));
  const [chaveId, setChaveId] = useState("");

  if (!whatsapp) {
    return <p className="text-sm text-text-dim">Cadastre o WhatsApp do cliente para enviar mensagens.</p>;
  }

  const ehRenovacao = modelo === "Renovação";
  const chaveSelecionada = chaves.find((c) => c.id === chaveId);
  const mensagemFinal = chaveSelecionada
    ? `${mensagem}\n\nChave Pix (${chaveSelecionada.tipo}): ${chaveSelecionada.valor}`
    : mensagem;

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

      {ehRenovacao ? (
        <p className="text-xs text-text-dim">Confirmação de renovação — sem chave Pix, o cliente já pagou.</p>
      ) : chaves.length > 0 ? (
        <Field label="Anexar chave Pix (opcional)">
          <Select value={chaveId} onChange={(e) => setChaveId(e.target.value)}>
            <option value="">Nenhuma</option>
            {chaves.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tipo}: {c.valor}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <RegistrarCobrancaLink clienteId={clienteId} whatsapp={whatsapp} mensagem={mensagemFinal} modelo={modelo}>
        <Button variant="whatsapp" className="w-full">
          Avisar cliente no WhatsApp
        </Button>
      </RegistrarCobrancaLink>
    </div>
  );
}
