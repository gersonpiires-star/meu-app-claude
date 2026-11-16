"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Input, cx } from "@/components/ui";
import { brl } from "@/lib/format";
import { IconCaixa } from "@/components/nav-icons";
import { ReporForm } from "./repor-form";
import { reporEstoque } from "./actions";

type LinhaProduto = {
  id: string;
  modelo: string;
  atual: number;
  estoqueMinimo: number;
  custoMedio: number;
  precoSugerido: number;
  baixo: boolean;
  arquivado: boolean;
};

export function ProdutosTabela({
  produtos,
  acaoAjustar,
  acaoArquivar,
  acaoDesarquivar,
}: {
  produtos: LinhaProduto[];
  acaoAjustar: (produtoId: string, formData: FormData) => Promise<{ ok: false; erro: string } | void>;
  acaoArquivar: (id: string) => Promise<void>;
  acaoDesarquivar: (id: string) => Promise<void>;
}) {
  const [busca, setBusca] = useState("");
  const [ajustandoId, setAjustandoId] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const filtrados = produtos.filter((p) => p.modelo.toLowerCase().includes(busca.toLowerCase()));

  function alternarArquivo(p: LinhaProduto) {
    const confirmado = p.arquivado
      ? confirm(`Restaurar "${p.modelo}" pra lista de produtos ativos?`)
      : confirm(`Arquivar "${p.modelo}"? Ele some dos seletores de nova venda/reposição, mas o histórico continua intacto.`);
    if (!confirmado) return;
    iniciarTransicao(() => (p.arquivado ? acaoDesarquivar(p.id) : acaoArquivar(p.id)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-text">Produtos</h2>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto…"
          className="w-56"
        />
      </div>

      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_220px] md:gap-3 md:border-b md:border-border md:pb-2 md:text-[11px] md:font-semibold md:uppercase md:tracking-wider md:text-text-dim">
        <span className="truncate">Produto</span>
        <span className="truncate">Estoque</span>
        <span className="truncate">Mínimo</span>
        <span className="truncate">Custo un.</span>
        <span className="truncate">Preço venda</span>
        <span className="truncate">Status</span>
        <span />
      </div>

      <div className="flex flex-col divide-y divide-border">
        {filtrados.map((p) => (
          <div key={p.id} className="py-3">
            {/* Desktop (md+): mesma grade de colunas do cabeçalho acima. */}
            <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_220px] md:items-center md:gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    p.baixo ? "bg-danger-bg text-danger" : "bg-accent-soft text-accent"
                  )}
                >
                  <IconCaixa className="h-4 w-4" />
                </span>
                <span className="truncate text-sm font-semibold text-text">{p.modelo}</span>
              </div>
              <span className="text-sm font-semibold text-text">{p.atual}</span>
              <span className="text-sm text-text-muted">{p.estoqueMinimo}</span>
              <span className="text-sm text-text-muted">{brl(p.custoMedio)}</span>
              <span className="text-sm font-semibold text-money">{brl(p.precoSugerido)}</span>
              <span>
                {p.arquivado ? (
                  <Badge tone="neutral">Arquivado</Badge>
                ) : p.baixo ? (
                  <Badge tone="danger">Repor</Badge>
                ) : (
                  <Badge tone="success">OK</Badge>
                )}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                {!p.arquivado ? (
                  <>
                    <ReporForm acao={reporEstoque.bind(null, p.id)} />
                    <button
                      type="button"
                      className="whitespace-nowrap text-xs font-semibold text-text-dim hover:text-text"
                      onClick={() => setAjustandoId(ajustandoId === p.id ? null : p.id)}
                    >
                      Ajustar
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={pendente}
                  className="whitespace-nowrap text-xs font-semibold text-text-dim hover:text-danger"
                  onClick={() => alternarArquivo(p)}
                >
                  {p.arquivado ? "Restaurar" : "Arquivar"}
                </button>
              </div>
            </div>

            {/* Celular: o cabeçalho de colunas some (não cabe), então sem
                rótulo em cada campo os números ficavam soltos — "2" ao lado
                de "3" sem indicar qual é estoque e qual é mínimo. Aqui cada
                valor leva sua etiqueta. */}
            <div className="flex flex-col gap-3 md:hidden">
              <div className="flex items-center gap-3">
                <span
                  className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    p.baixo ? "bg-danger-bg text-danger" : "bg-accent-soft text-accent"
                  )}
                >
                  <IconCaixa className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{p.modelo}</span>
                {p.arquivado ? (
                  <Badge tone="neutral">Arquivado</Badge>
                ) : p.baixo ? (
                  <Badge tone="danger">Repor</Badge>
                ) : (
                  <Badge tone="success">OK</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-surface-2 p-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Estoque</p>
                  <p className="font-semibold text-text">{p.atual}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Mínimo</p>
                  <p className="text-text-muted">{p.estoqueMinimo}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Custo un.</p>
                  <p className="text-text-muted">{brl(p.custoMedio)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Preço venda</p>
                  <p className="font-semibold text-money">{brl(p.precoSugerido)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!p.arquivado ? (
                  <>
                    <ReporForm acao={reporEstoque.bind(null, p.id)} />
                    <button
                      type="button"
                      className="whitespace-nowrap text-xs font-semibold text-text-dim hover:text-text"
                      onClick={() => setAjustandoId(ajustandoId === p.id ? null : p.id)}
                    >
                      Ajustar
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  disabled={pendente}
                  className="whitespace-nowrap text-xs font-semibold text-text-dim hover:text-danger"
                  onClick={() => alternarArquivo(p)}
                >
                  {p.arquivado ? "Restaurar" : "Arquivar"}
                </button>
              </div>
            </div>

            {ajustandoId === p.id ? (
              <form
                className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-border-strong p-3"
                action={(formData) =>
                  iniciarTransicao(async () => {
                    await acaoAjustar(p.id, formData);
                    setAjustandoId(null);
                  })
                }
              >
                <Input type="number" name="quantidadePerdida" min={1} step="1" placeholder="Qtd. perdida" required className="w-32" />
                <Input name="motivo" placeholder="Motivo (ex: quebrou, extraviou)" required className="flex-1" />
                <Button type="submit" disabled={pendente} variant="ghost">
                  {pendente ? "Salvando…" : "Confirmar baixa"}
                </Button>
              </form>
            ) : null}
          </div>
        ))}
        {filtrados.length === 0 ? <p className="py-4 text-sm text-text-dim">Nenhum produto encontrado.</p> : null}
      </div>
    </div>
  );
}
