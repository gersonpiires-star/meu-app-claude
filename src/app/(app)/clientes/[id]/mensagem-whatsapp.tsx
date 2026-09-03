"use client";

import { useState } from "react";
import { Button, Field, Select, Textarea, cx } from "@/components/ui";
import { preencherModelo } from "@/lib/mensagens";
import { RegistrarCobrancaLink } from "../../painel/registrar-cobranca-link";

export function MensagemWhatsApp({
  clienteId,
  whatsapp,
  dados,
  chaves = [],
  modelos,
  linkPagamento = null,
}: {
  clienteId: string;
  whatsapp: string | null;
  dados: Record<string, string>;
  chaves?: { id: string; tipo: string; valor: string }[];
  modelos: Record<string, string>;
  linkPagamento?: string | null;
}) {
  const MODELOS = modelos;
  const [modelo, setModelo] = useState(Object.keys(MODELOS)[0]);
  const [mensagem, setMensagem] = useState(() => preencherModelo(MODELOS[Object.keys(MODELOS)[0]] ?? "", dados));
  const [chaveId, setChaveId] = useState("");
  const [copiado, setCopiado] = useState(false);

  if (!whatsapp) {
    return <p className="text-sm text-text-dim">Cadastre o WhatsApp do cliente para enviar mensagens.</p>;
  }

  const ehRenovacao = modelo === "Renovação";
  const ehLink = chaveId === "__link__";
  const chaveSelecionada = chaves.find((c) => c.id === chaveId);
  const mensagemFinal =
    ehLink && linkPagamento
      ? `${mensagem}\n\nPague com Pix ou cartão pelo link: ${linkPagamento}`
      : chaveSelecionada
        ? `${mensagem}\n\nChave Pix (${chaveSelecionada.tipo}): ${chaveSelecionada.valor}`
        : mensagem;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Modelo de mensagem">
        <div className="flex flex-wrap gap-2">
          {Object.keys(MODELOS).map((chave) => (
            <button
              key={chave}
              type="button"
              onClick={() => {
                setModelo(chave);
                setMensagem(preencherModelo(MODELOS[chave] ?? "", dados));
              }}
              className={cx(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                modelo === chave ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
              )}
            >
              {chave}
            </button>
          ))}
        </div>
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Pré-visualização</span>
        <Textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          className="min-h-40 rounded-2xl border-accent-strong bg-accent-soft/40 text-text"
        />
      </div>

      {ehRenovacao ? (
        <p className="text-xs text-text-dim">Confirmação de renovação — sem chave Pix, o cliente já pagou.</p>
      ) : chaves.length > 0 || linkPagamento ? (
        <Field label="Anexar na mensagem (opcional)">
          <Select value={chaveId} onChange={(e) => setChaveId(e.target.value)}>
            <option value="">Nenhuma</option>
            {chaves.map((c) => (
              <option key={c.id} value={c.id}>
                Chave Pix — {c.tipo}: {c.valor}
              </option>
            ))}
            {linkPagamento ? <option value="__link__">Link de pagamento (Mercado Pago)</option> : null}
          </Select>
        </Field>
      ) : null}
      {ehLink && linkPagamento ? (
        <p className="-mt-2 text-[11px] text-text-dim">
          O cliente abre o link e paga sozinho com Pix ou cartão — a renovação é registrada automaticamente.
        </p>
      ) : null}

      <div className="flex gap-2">
        <RegistrarCobrancaLink clienteId={clienteId} whatsapp={whatsapp} mensagem={mensagemFinal} modelo={modelo} className="flex-1">
          <Button variant="whatsapp" className="w-full">
            Enviar no WhatsApp
          </Button>
        </RegistrarCobrancaLink>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(mensagemFinal);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? "Copiado!" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}
