"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, cx } from "@/components/ui";
import { brl, dataCurta } from "@/lib/format";

export type LoteDetalhe = { id: string; data: Date; quantidade: number; valorPago: number };

type AcaoEditar = (loteId: string, formData: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>;

export function LoteItem({ lote, acao, podeEditar }: { lote: LoteDetalhe; acao?: AcaoEditar; podeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  // Linha de "Ajustar saldo" (ajustar-saldo-form.tsx) grava aqui com
  // valorPago=0 pra marcar que não é uma compra — diferente de uma recarga
  // de R$ 0,00 real (rara, mas possível), não tem como saber com certeza só
  // pelo valor, mas corrigir pelo mesmo "Ajustar saldo" de novo (em vez de
  // editar esse registro direto) é sempre a forma certa de consertar um
  // ajuste, então a edição nem é oferecida pra esse tipo de linha.
  const ehAjuste = lote.valorPago === 0;

  if (editando && acao) {
    return (
      <form
        className={cx("flex flex-col gap-2 rounded-lg border border-accent-strong bg-accent-soft px-3 py-2.5 text-sm")}
        action={(formData) =>
          iniciarTransicao(async () => {
            const resposta = await acao(lote.id, formData);
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
          <Field label="Quantidade">
            <Input type="number" name="quantidade" min={1} step="1" defaultValue={lote.quantidade} required />
          </Field>
          <Field label="Valor pago (R$)">
            <Input type="number" name="valorPago" min={0} step="0.01" defaultValue={lote.valorPago} required />
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
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="text-text">
          {ehAjuste
            ? `${lote.quantidade > 0 ? "+" : ""}${lote.quantidade} crédito${Math.abs(lote.quantidade) === 1 ? "" : "s"} · ajuste de saldo`
            : `${lote.quantidade} crédito${lote.quantidade === 1 ? "" : "s"} · ${brl(lote.valorPago)}`}
        </p>
        <p className="text-[11px] text-text-dim">{dataCurta(lote.data)}</p>
      </div>
      {podeEditar && acao && !ehAjuste ? (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="shrink-0 text-xs font-semibold text-text-dim hover:text-accent"
        >
          Editar
        </button>
      ) : null}
    </div>
  );
}
