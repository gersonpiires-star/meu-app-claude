"use client";

import { useTransition } from "react";
import { Button, cx } from "@/components/ui";
import { dataCurta } from "@/lib/format";
import { diasParaVencer } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/mensagens";
import { excluirInteressado, marcarConvertido } from "./actions";

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

export function InteressadoItem({
  lead,
}: {
  lead: {
    id: string;
    nome: string;
    whatsapp: string;
    interesse: string | null;
    retornarEm: Date | null;
    observacao: string | null;
  };
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const tag = tagRetorno(lead.retornarEm);
  const mensagem = `Olá ${lead.nome.split(" ")[0]}, tudo bem? Passando pra saber se ficou alguma dúvida sobre o ${lead.interesse ?? "plano"}.`;

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
        ) : null}
        <Button
          className="flex-1"
          disabled={pendente}
          onClick={() => iniciarTransicao(() => marcarConvertido(lead.id))}
        >
          {pendente ? "…" : "Virou cliente"}
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
