"use client";

import { useState } from "react";
import { Button, Field, Select, Textarea, cx } from "@/components/ui";
import { preencherModelo } from "@/lib/mensagens";
import { CompartilharRecibo } from "@/components/compartilhar-recibo";
import { RegistrarCobrancaLink } from "../../painel/registrar-cobranca-link";

// Encaixa uma linha extra logo abaixo da primeira linha do modelo que
// começa com `marcador` (ex: "valor", "válido") — se não achar, cai no final.
function inserirApos(texto: string, marcador: string, linha: string): string {
  const linhas = texto.split("\n");
  const idx = linhas.findIndex((l) => l.trim().toLowerCase().startsWith(marcador));
  if (idx === -1) return `${texto}\n\n${linha}`;
  linhas.splice(idx + 1, 0, linha);
  return linhas.join("\n");
}

export function MensagemWhatsApp({
  clienteId,
  whatsapp,
  dados,
  chaves = [],
  modelos,
  linkPagamento = null,
  ultimaRenovacaoId = null,
}: {
  clienteId: string;
  whatsapp: string | null;
  dados: Record<string, string>;
  chaves?: { id: string; tipo: string; valor: string }[];
  modelos: Record<string, string>;
  linkPagamento?: string | null;
  ultimaRenovacaoId?: string | null;
}) {
  const MODELOS = modelos;
  const [modelo, setModelo] = useState(Object.keys(MODELOS)[0]);
  const [mensagem, setMensagem] = useState(() => preencherModelo(MODELOS[Object.keys(MODELOS)[0]] ?? "", dados));
  const [chaveId, setChaveId] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [incluirRecibo, setIncluirRecibo] = useState(true);

  if (!whatsapp) {
    return <p className="text-sm text-text-dim">Cadastre o WhatsApp do cliente para enviar mensagens.</p>;
  }

  const ehRenovacao = modelo === "Renovação";
  const ehLink = chaveId === "__link__";
  const chaveSelecionada = chaves.find((c) => c.id === chaveId);
  const linhaAnexo =
    ehLink && linkPagamento
      ? `Pague com Pix ou cartão pelo link: ${linkPagamento}`
      : chaveSelecionada
        ? `Chave Pix (${chaveSelecionada.tipo}): ${chaveSelecionada.valor}`
        : null;
  let mensagemFinal = linhaAnexo ? inserirApos(mensagem, "valor", linhaAnexo) : mensagem;
  if (ehRenovacao && ultimaRenovacaoId && incluirRecibo) {
    mensagemFinal = inserirApos(mensagemFinal, "válido", "📄 Segue o recibo dessa renovação em anexo.");
  }

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

      <Field label="Mensagem">
        <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="min-h-32" />
      </Field>

      {ehRenovacao ? (
        <div className="-mt-2 flex flex-col gap-2">
          <p className="text-xs text-text-dim">Confirmação de renovação — sem chave Pix, o cliente já pagou.</p>
          {ultimaRenovacaoId ? (
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-text-dim">
                <input
                  type="checkbox"
                  checked={incluirRecibo}
                  onChange={(e) => setIncluirRecibo(e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong accent-accent"
                />
                Enviar recibo em PDF junto
              </label>
              {incluirRecibo ? (
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={`/api/renovacoes/${ultimaRenovacaoId}/recibo`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    Baixar recibo em PDF ↓
                  </a>
                  <CompartilharRecibo
                    reciboUrl={`/api/renovacoes/${ultimaRenovacaoId}/recibo`}
                    nomeArquivo={`recibo-${dados.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`}
                    mensagem={mensagemFinal}
                    className="px-3 py-1.5 text-xs"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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

      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Pré-visualização</span>
        <div className="min-h-32 whitespace-pre-wrap rounded-2xl border border-accent-strong bg-accent-soft/40 px-3.5 py-2.5 text-sm text-text">
          {mensagemFinal}
        </div>
      </div>

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
      {ehRenovacao && ultimaRenovacaoId && incluirRecibo ? (
        <p className="-mt-1 text-[11px] text-text-dim">
          &ldquo;Enviar no WhatsApp&rdquo; abre a conversa certa mas só com o texto — o WhatsApp não deixa anexar
          arquivo pelo link. &ldquo;Compartilhar recibo&rdquo; (se aparecer, depende do celular) já manda o PDF
          anexado, só que você escolhe o contato na hora.
        </p>
      ) : null}
    </div>
  );
}
