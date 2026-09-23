"use client";

import { useState, useTransition } from "react";
import { Button, Input, ProgressRing } from "@/components/ui";
import { brl0 } from "@/lib/format";
import { definirMetaMensal } from "./actions";

// Fica embutida no card de destaque do Painel (lado direito do "Entrou no
// mês"), por isso não tem Card próprio.
export function MetaMensalCard({
  meta,
  receitaAtual,
  diasRestantes,
}: {
  meta: number | null;
  receitaAtual: number;
  diasRestantes: number;
}) {
  // Estado local em vez de confiar só na prop `meta`: revalidatePath refaz o
  // fetch do servidor de forma assíncrona, então logo após salvar a prop
  // ainda pode chegar como null por um instante — o que já derrubou a tela
  // com "Cannot read properties of null" ao formatar a meta antiga. Ajusta
  // durante a renderização (não num useEffect) quando a prop muda de
  // verdade — padrão recomendado pelo próprio React pra isso.
  const [metaAtual, setMetaAtual] = useState(meta);
  const [metaPropAnterior, setMetaPropAnterior] = useState(meta);
  if (meta !== metaPropAnterior) {
    setMetaPropAnterior(meta);
    setMetaAtual(meta);
  }
  const [editando, setEditando] = useState(meta == null);
  const [valor, setValor] = useState(meta ? String(meta) : "");
  const [pendente, iniciarTransicao] = useTransition();

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
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-text">Meta do mês</h2>
        <p className="text-xs text-text-dim">Defina um alvo de receita (renovações + aparelhos) pra acompanhar seu progresso aqui.</p>
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
              aria-label="Valor da meta em reais"
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
      </div>
    );
  }

  const pct = metaAtual ? (receitaAtual / metaAtual) * 100 : 0;
  const bateu = metaAtual != null && receitaAtual >= metaAtual;
  const falta = metaAtual ? Math.max(0, metaAtual - receitaAtual) : 0;
  const porDia = diasRestantes > 0 ? falta / diasRestantes : falta;

  return (
    <div className="flex items-center gap-4">
      <ProgressRing pct={pct} size={104} espessura={11} cor={bateu ? "var(--accent)" : "var(--money)"}>
        <span className="text-xl font-bold text-text">{Math.min(999, Math.round(pct))}%</span>
        <span className="text-[10px] text-text-dim">da meta</span>
      </ProgressRing>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Meta do mês</span>
        <span className="text-sm font-bold text-text">
          {brl0(receitaAtual)} de {brl0(metaAtual ?? 0)}
        </span>
        <span className="text-xs leading-snug text-text-dim">
          {bateu
            ? "Meta batida! Que tal subir o alvo do mês que vem?"
            : diasRestantes > 0
              ? `Faltam ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"} · ~${brl0(porDia)} por dia`
              : `Faltam ${brl0(falta)} hoje`}
        </span>
        <button
          type="button"
          onClick={() => {
            setEditando(true);
            setValor(metaAtual ? String(metaAtual) : "");
          }}
          className="self-start text-xs font-semibold text-accent hover:brightness-110"
        >
          Editar meta
        </button>
      </div>
    </div>
  );
}
