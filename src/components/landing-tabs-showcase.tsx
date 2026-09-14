"use client";

import { useState } from "react";
import { cx } from "@/components/ui";

const TABS = [
  { id: "clientes", label: "Clientes", img: "/landing-shot-clientes.png", alt: "Lista de clientes do GestorPro, com vencimento e status de cada um" },
  { id: "relatorio", label: "Relatório", img: "/landing-shot-relatorio.png", alt: "Relatório financeiro do mês no GestorPro, com entradas, custos e lucro" },
  { id: "vendas", label: "Vendas", img: "/landing-shot-vendas.png", alt: "Tela de vendas de aparelhos do GestorPro" },
  { id: "painel", label: "Painel", img: "/landing-shot-painel.png", alt: "Painel com as métricas do mês no GestorPro" },
] as const;

export function LandingTabsShowcase() {
  const [ativo, setAtivo] = useState<(typeof TABS)[number]["id"]>("clientes");
  const tab = TABS.find((t) => t.id === ativo)!;

  return (
    <div>
      <div className="mx-auto flex w-fit flex-wrap justify-center gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAtivo(t.id)}
            className={cx(
              "rounded-lg px-4 py-2 text-sm font-semibold transition",
              ativo === t.id ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-8 max-w-4xl">
        <div className="absolute inset-x-10 -top-6 h-40 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
        <div className="relative overflow-hidden rounded-2xl border-[10px] border-surface-2 bg-bg-deep shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={tab.id} src={tab.img} alt={tab.alt} className="block w-full" />
        </div>
      </div>
    </div>
  );
}
