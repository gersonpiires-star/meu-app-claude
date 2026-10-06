"use client";

import { useState } from "react";
import Image from "next/image";
import { cx } from "@/components/ui";

// Largura/altura reais do PNG — o next/image usa isso só pra calcular o
// aspect ratio e evitar layout shift; o tamanho exibido continua 100% da
// largura do container (w-full h-auto no <Image>).
const TABS = [
  { id: "painel", label: "Painel", img: "/landing-shot-painel.png", w: 3360, h: 1080, alt: "Painel com as métricas do mês no GestorPro" },
  { id: "clientes", label: "Clientes", img: "/landing-shot-clientes.png", w: 3360, h: 1400, alt: "Lista de clientes do GestorPro, com vencimento e status de cada um" },
  { id: "vendas", label: "Vendas", img: "/landing-shot-vendas.png", w: 3360, h: 1240, alt: "Tela de vendas de aparelhos do GestorPro" },
  { id: "relatorio", label: "Relatório", img: "/landing-shot-relatorio.png", w: 3360, h: 1440, alt: "Relatório financeiro do mês no GestorPro, com entradas, custos e lucro" },
] as const;

export function LandingTabsShowcase() {
  const [ativo, setAtivo] = useState<(typeof TABS)[number]["id"]>("painel");
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
          <Image
            key={tab.id}
            src={tab.img}
            alt={tab.alt}
            width={tab.w}
            height={tab.h}
            sizes="(min-width: 896px) 896px, 100vw"
            className="block h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}
