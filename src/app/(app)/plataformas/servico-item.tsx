"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, cx } from "@/components/ui";
import { brl, brl0 } from "@/lib/format";
import { atualizarConfigServico, excluirServico } from "./actions";

type Servico = {
  id: string;
  nome: string;
  plataformaId: string | null;
  custoCredito: number | null;
  cobrancaTelaExtra: number | null;
  totalClientes: number;
};

export function ServicoItem({
  servico,
  plataformas,
  podeExcluir = false,
}: {
  servico: Servico;
  plataformas: { id: string; nome: string }[];
  podeExcluir?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [plataformaId, setPlataformaId] = useState(servico.plataformaId ?? "");
  const [pendente, iniciarTransicao] = useTransition();
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);
  const plataformaAtual = plataformas.find((p) => p.id === servico.plataformaId);

  function excluir() {
    if (!confirm(`Excluir o app ${servico.nome}? Essa ação não pode ser desfeita.`)) return;
    setErroExcluir(null);
    iniciarTransicao(async () => {
      const resultado = await excluirServico(servico.id);
      if (!resultado.ok) setErroExcluir(resultado.erro);
    });
  }

  if (!editando) {
    return (
      <Card className="flex flex-row items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{servico.nome}</p>
          <p className="text-xs text-text-dim">
            {servico.totalClientes} cliente{servico.totalClientes === 1 ? "" : "s"}
            {servico.custoCredito ? ` · ${brl(servico.custoCredito)} por mês` : ""}
          </p>
          <p className="text-xs font-semibold text-accent">
            {servico.cobrancaTelaExtra ? `Taxa de tela extra ${brl0(servico.cobrancaTelaExtra)}` : "Sem taxa por tela extra"}
          </p>
          {!plataformaAtual ? <p className="text-xs font-semibold text-warning">Sem plataforma vinculada</p> : null}
          {erroExcluir ? <p className="mt-1 text-[11px] text-danger">{erroExcluir}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label={`Editar ${servico.nome}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-accent transition hover:brightness-110"
          >
            ✎
          </button>
          {podeExcluir ? (
            <button
              type="button"
              disabled={pendente}
              onClick={excluir}
              aria-label={`Excluir ${servico.nome}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-danger transition hover:brightness-110 disabled:opacity-50"
            >
              ✕
            </button>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form
        action={(formData) =>
          iniciarTransicao(async () => {
            await atualizarConfigServico(servico.id, formData);
            setEditando(false);
          })
        }
        className="flex flex-col gap-3"
      >
        <p className="font-semibold text-text">Editar {servico.nome}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Crédito (R$)">
            <Input type="number" name="custoCredito" min={0} step="0.01" defaultValue={servico.custoCredito ?? ""} />
          </Field>
          <Field label="Cobro por tela extra (R$)">
            <Input type="number" name="cobrancaTelaExtra" min={0} step="0.01" defaultValue={servico.cobrancaTelaExtra ?? ""} />
          </Field>
        </div>
        <Field label="Compra o crédito em">
          <input type="hidden" name="plataformaId" value={plataformaId} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPlataformaId("")}
              className={cx(
                "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                plataformaId === "" ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
              )}
            >
              Sem plataforma
            </button>
            {plataformas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlataformaId(p.id)}
                className={cx(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  plataformaId === p.id ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
                )}
              >
                {p.nome}
              </button>
            ))}
          </div>
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
    </Card>
  );
}
