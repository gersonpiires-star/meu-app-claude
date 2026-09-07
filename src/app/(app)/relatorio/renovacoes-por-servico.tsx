"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, cx } from "@/components/ui";
import { brl } from "@/lib/format";

export type ItemRenovacao = { id: string; nome: string; sub: string; liquido: number; valor: number; custo: number };
export type GrupoRenovacao = { servico: string; qtd: number; meses: number; bruto: number; custo: number; itens: ItemRenovacao[] };

type AcaoEditar = (renovacaoId: string, formData: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>;
type AcaoExcluir = (renovacaoId: string) => Promise<{ ok: true; restaurado: boolean } | { ok: false; erro: string }>;

function ItemLinha({
  item,
  acao,
  acaoExcluir,
  podeEditar,
}: {
  item: ItemRenovacao;
  acao?: AcaoEditar;
  acaoExcluir?: AcaoExcluir;
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const [pendenteExcluir, iniciarTransicaoExcluir] = useTransition();

  function excluir() {
    if (!acaoExcluir) return;
    if (
      !confirm(
        "Excluir essa renovação? Se for a mais recente do cliente, ele volta pro plano/valor/vencimento de antes dela e o crédito usado volta pra plataforma. Caso contrário, só o registro é removido (sem mexer na data de vencimento). Essa ação não pode ser desfeita."
      )
    ) {
      return;
    }
    setErro(null);
    iniciarTransicaoExcluir(async () => {
      const resultado = await acaoExcluir(item.id);
      if (!resultado.ok) {
        setErro(resultado.erro);
      } else if (!resultado.restaurado) {
        alert("Renovação excluída. O vencimento do cliente NÃO foi ajustado automaticamente — confira e corrija se precisar.");
      }
    });
  }

  if (editando && acao) {
    return (
      <form
        className="flex flex-col gap-2 py-2"
        action={(formData) =>
          iniciarTransicao(async () => {
            const resposta = await acao(item.id, formData);
            if (resposta.ok) {
              setEditando(false);
              setErro(null);
            } else {
              setErro(resposta.erro);
            }
          })
        }
      >
        <span className="text-sm font-semibold text-text">{item.nome}</span>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (R$)">
            <Input type="number" name="valor" min={0} step="0.01" defaultValue={item.valor} required />
          </Field>
          <Field label="Custo de crédito (R$)">
            <Input type="number" name="custo" min={0} step="0.01" defaultValue={item.custo} required />
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
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">{item.nome}</span>
          <span className="block text-[11px] text-text-dim">{item.sub}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-semibold text-accent">{brl(item.liquido)}</span>
          <span className="text-[11px] text-danger">− {brl(item.custo)}</span>
        </span>
        {podeEditar && acao ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 text-[11px] font-semibold text-text-dim hover:text-accent"
          >
            Editar
          </button>
        ) : null}
        {podeEditar && acaoExcluir ? (
          <button
            type="button"
            disabled={pendenteExcluir}
            onClick={excluir}
            className="shrink-0 text-[11px] font-semibold text-danger hover:underline disabled:opacity-50"
          >
            {pendenteExcluir ? "Excluindo…" : "Excluir"}
          </button>
        ) : null}
      </div>
      {erro ? <p className="text-right text-[11px] font-semibold text-danger">{erro}</p> : null}
    </div>
  );
}

export function RenovacoesPorServico({
  grupos,
  acao,
  acaoExcluir,
  podeEditar = false,
}: {
  grupos: GrupoRenovacao[];
  acao?: AcaoEditar;
  acaoExcluir?: AcaoExcluir;
  podeEditar?: boolean;
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (grupos.length === 0) {
    return <p className="text-sm text-text-dim">Nenhuma renovação registrada neste mês</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {grupos.map((g) => {
        const liquido = g.bruto - g.custo;
        const expandido = aberto === g.servico;
        return (
          <div
            key={g.servico}
            className={cx("overflow-hidden rounded-xl border", expandido ? "border-accent-strong bg-accent-soft" : "border-border bg-surface-2")}
          >
            <button type="button" onClick={() => setAberto(expandido ? null : g.servico)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {g.servico} · {g.qtd} {g.qtd === 1 ? "renovação" : "renovações"}
                </p>
                <p className="text-[11px] text-text-dim">
                  {g.meses} mês(es) de crédito · {brl(g.bruto)} − {brl(g.custo)}
                </p>
              </span>
              <span className={cx("shrink-0 font-bold", liquido >= 0 ? "text-accent" : "text-danger")}>{brl(liquido)}</span>
              <span className="w-3 shrink-0 text-center text-text-dim">{expandido ? "−" : "+"}</span>
            </button>
            {expandido ? (
              <div className="flex flex-col divide-y divide-border px-4 pb-3">
                {g.itens.map((item) => (
                  <ItemLinha key={item.id} item={item} acao={acao} acaoExcluir={acaoExcluir} podeEditar={podeEditar} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
