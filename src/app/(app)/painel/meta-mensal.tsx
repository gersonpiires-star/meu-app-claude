"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Card, Input, cx } from "@/components/ui";
import { brl0 } from "@/lib/format";
import { definirMetaMensal } from "./actions";

export function MetaMensalCard({ meta, receitaAtual }: { meta: number | null; receitaAtual: number }) {
  // Estado local em vez de confiar só na prop `meta`: revalidatePath refaz o
  // fetch do servidor de forma assíncrona, então logo após salvar a prop
  // ainda pode chegar como null por um instante — o que já derrubou a tela
  // com "Cannot read properties of null" ao formatar a meta antiga.
  const [metaAtual, setMetaAtual] = useState(meta);
  const [editando, setEditando] = useState(meta == null);
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const [pendente, iniciarTransicao] = useTransition();

  useEffect(() => {
    setMetaAtual(meta);
  }, [meta]);

  function salvar() {
    const numero = Number(valor.replace(",", "."));
    if (!numero || numero <= 0) return;
    iniciarTransicao(async () => {
      await definirMetaMensal(numero);
      setMetaAtual(numero);
      setEditando(false);
    });
  }

  if (editando) {
    return (
      <Card>
        <h2 className="mb-1 text-sm font-bold text-text">Meta do mês</h2>
        <p className="mb-3 text-xs text-text-dim">Defina um alvo de receita (renovações + aparelhos) pra acompanhar seu progresso aqui.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-text-dim">R$</span>
          <div className="w-32">
            <Input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="ex: 3000"
            />
          </div>
          <Button onClick={salvar} disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar meta"}
          </Button>
          {metaAtual != null ? (
            <button type="button" onClick={() => setEditando(false)} className="text-xs font-semibold text-text-dim hover:text-text">
              Cancelar
            </button>
          ) : null}
        </div>
      </Card>
    );
  }

  const pct = metaAtual ? Math.min(100, (receitaAtual / metaAtual) * 100) : 0;
  const bateu = metaAtual != null && receitaAtual >= metaAtual;

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Meta do mês</h2>
        <button
          type="button"
          onClick={() => {
            setEditando(true);
            setValor(metaAtual ? String(metaAtual) : "");
          }}
          className="text-xs font-semibold text-text-dim hover:text-accent"
        >
          Editar
        </button>
      </div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-lg font-bold text-text">{brl0(receitaAtual)}</span>
        <span className="text-xs text-text-dim">de {brl0(metaAtual ?? 0)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cx("h-full rounded-full transition-all", bateu ? "bg-accent" : "bg-accent-strong")}
          style={{ width: `${pct > 0 ? Math.max(pct, 3) : 0}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-text-dim">{bateu ? "Meta batida! 🎉" : `${pct.toFixed(0)}% da meta`}</p>
    </Card>
  );
}
