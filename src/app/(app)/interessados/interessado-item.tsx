"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import { dataCurta } from "@/lib/format";
import { diasParaVencer } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/mensagens";
import { excluirInteressado, editarInteressado } from "./actions";

type Tom = "danger" | "warning" | "neutral";

const TOM_BADGE: Record<Tom, string> = {
  danger: "border-danger-border bg-danger-bg text-danger",
  warning: "border-warning-border bg-warning-bg text-warning",
  neutral: "border-border-strong text-text-dim",
};

function tagRetorno(retornarEm: Date | null): { label: string; tom: Tom } | null {
  if (!retornarEm) return null;
  const dias = diasParaVencer(retornarEm);
  if (dias < 0) return { label: `${Math.abs(dias)}d atrás`, tom: "danger" };
  if (dias === 0) return { label: "Hoje", tom: "warning" };
  return { label: `Em ${dias}d`, tom: "neutral" };
}

type Lead = {
  id: string;
  nome: string;
  whatsapp: string;
  interesse: string | null;
  retornarEm: Date | null;
  observacao: string | null;
};

export function InteressadoItem({ lead }: { lead: Lead }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [editando, setEditando] = useState(false);
  const tag = tagRetorno(lead.retornarEm);
  const mensagem = `Olá ${lead.nome.split(" ")[0]}, tudo bem? Passando pra saber se ficou alguma dúvida sobre o ${lead.interesse ?? "plano"}.`;

  const paramsVirarCliente = new URLSearchParams({ interessadoId: lead.id, nome: lead.nome, whatsapp: lead.whatsapp });
  if (lead.interesse) paramsVirarCliente.set("servico", lead.interesse);

  if (editando) {
    return (
      <form
        className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-surface p-4"
        action={(formData) =>
          iniciarTransicao(async () => {
            await editarInteressado(lead.id, formData);
            setEditando(false);
          })
        }
      >
        <p className="text-sm font-bold text-text">Editar interessado</p>
        <Field label="Nome">
          <Input name="nome" defaultValue={lead.nome} required />
        </Field>
        <Field label="WhatsApp">
          <Input name="whatsapp" defaultValue={lead.whatsapp} inputMode="tel" placeholder="DDD + número" />
        </Field>
        <Field label="Interesse">
          <Input name="interesse" defaultValue={lead.interesse ?? ""} />
        </Field>
        <Field label="Retornar em (DD/MM/AAAA)">
          <Input name="retornarEm" defaultValue={lead.retornarEm ? dataCurta(lead.retornarEm) : ""} placeholder="deixe vazio se não marcou" />
        </Field>
        <Field label="Observação">
          <Textarea name="observacao" defaultValue={lead.observacao ?? ""} />
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditando(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente} className="flex-1">
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border-strong bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-text">{lead.nome}</p>
        {tag ? (
          <span className={cx("shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide", TOM_BADGE[tag.tom])}>
            {tag.label}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-text-dim">
        {[lead.interesse, lead.whatsapp || null, lead.retornarEm ? `retorno ${dataCurta(lead.retornarEm)}` : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {lead.observacao ? <p className="text-xs uppercase tracking-wide text-accent">{lead.observacao}</p> : null}

      <div className="mt-1 flex gap-2">
        {lead.whatsapp ? (
          <a href={linkWhatsApp(lead.whatsapp, mensagem)} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="ghost" className="w-full">
              Chamar
            </Button>
          </a>
        ) : (
          <Button variant="ghost" className="flex-1" onClick={() => setEditando(true)}>
            + WhatsApp
          </Button>
        )}
        <Link href={`/clientes/novo?${paramsVirarCliente.toString()}`} className="flex-1">
          <Button className="w-full">Virar cliente</Button>
        </Link>
        <Button variant="ghost" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <Button
          variant="danger"
          disabled={pendente}
          onClick={() => {
            if (confirm(`Remover ${lead.nome} da lista de interessados?`)) {
              iniciarTransicao(() => excluirInteressado(lead.id));
            }
          }}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
