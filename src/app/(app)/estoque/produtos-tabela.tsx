"use client";

import { useState } from "react";
import { Badge, Input, cx } from "@/components/ui";
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
};

export function ProdutosTabela({ produtos }: { produtos: LinhaProduto[] }) {
  const [busca, setBusca] = useState("");
  const filtrados = produtos.filter((p) => p.modelo.toLowerCase().includes(busca.toLowerCase()));

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

      <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_140px] md:gap-3 md:border-b md:border-border md:pb-2 md:text-[11px] md:font-semibold md:uppercase md:tracking-wider md:text-text-dim">
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
          <div
            key={p.id}
            className="grid grid-cols-2 gap-3 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_140px] md:items-center"
          >
            <div className="col-span-2 flex items-center gap-3 md:col-span-1">
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
            <span>{p.baixo ? <Badge tone="danger">Repor</Badge> : <Badge tone="success">OK</Badge>}</span>
            <span className="col-span-2 md:col-span-1">
              <ReporForm acao={reporEstoque.bind(null, p.id)} />
            </span>
          </div>
        ))}
        {filtrados.length === 0 ? <p className="py-4 text-sm text-text-dim">Nenhum produto encontrado.</p> : null}
      </div>
    </div>
  );
}
