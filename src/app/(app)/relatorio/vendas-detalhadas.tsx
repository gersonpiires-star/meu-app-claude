"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, cx } from "@/components/ui";

type LinhaDetalhe = { rot: string; val: string };
export type VendaDetalhe = {
  id: string;
  nome: string;
  detalhe: string;
  liquidoTexto: string;
  liquidoPositivo: boolean;
  valorUnitario: number;
  custoUnitario: number;
  linhas: LinhaDetalhe[];
};

type AcaoEditar = (vendaId: string, formData: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>;

function CardVenda({ v, acao, podeEditar }: { v: VendaDetalhe; acao?: AcaoEditar; podeEditar: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className={cx("overflow-hidden rounded-xl border", aberto ? "border-accent-strong bg-accent-soft" : "border-border bg-surface-2")}>
      <button type="button" onClick={() => setAberto(!aberto)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{v.nome}</p>
          <p className="text-[11px] text-text-dim">{v.detalhe}</p>
        </span>
        <span className={cx("shrink-0 font-bold", v.liquidoPositivo ? "text-accent" : "text-danger")}>{v.liquidoTexto}</span>
        <span className="w-3 shrink-0 text-center text-text-dim">{aberto ? "−" : "+"}</span>
      </button>
      {aberto ? (
        <div className="flex flex-col px-4 pb-3">
          {editando && acao ? (
            <form
              className="flex flex-col gap-2 py-2"
              action={(formData) =>
                iniciarTransicao(async () => {
                  const resposta = await acao(v.id, formData);
                  if (resposta.ok) {
                    setEditando(false);
                    setErro(null);
                  } else {
                    setErro(resposta.erro);
                  }
                })
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <Field label="Valor unit. (R$)">
                  <Input type="number" name="valorUnitario" min={0} step="0.01" defaultValue={v.valorUnitario} required />
                </Field>
                <Field label="Custo unit. (R$)">
                  <Input type="number" name="custoUnitario" min={0} step="0.01" defaultValue={v.custoUnitario} required />
                </Field>
              </div>
              {erro ? <p className="text-xs font-semibold text-danger">{erro}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditando(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pendente} className="flex-1">
                  {pendente ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {v.linhas.map((l) => (
                <div key={l.rot} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{l.rot}</span>
                  <span className="text-right text-sm font-semibold text-text">{l.val}</span>
                </div>
              ))}
              {podeEditar && acao ? (
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="py-2 text-left text-[11px] font-semibold text-text-dim hover:text-accent"
                >
                  Editar
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function VendasDetalhadas({
  vendas,
  acao,
  podeEditar = false,
}: {
  vendas: VendaDetalhe[];
  acao?: AcaoEditar;
  podeEditar?: boolean;
}) {
  if (vendas.length === 0) {
    return <p className="text-sm text-text-dim">Nenhuma venda registrada neste mês</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {vendas.map((v) => (
        <CardVenda key={v.id} v={v} acao={acao} podeEditar={podeEditar} />
      ))}
    </div>
  );
}
