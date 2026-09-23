"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

type ModoTema = "dark" | "light" | "auto";

const CHAVE = "gestorpro-theme-mode";

function resolver(modo: ModoTema): "dark" | "light" {
  if (modo === "auto") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return modo;
}

function aplicar(modo: ModoTema) {
  document.documentElement.setAttribute("data-theme", resolver(modo));
}

const OPCOES: { valor: ModoTema; label: string }[] = [
  { valor: "dark", label: "Escuro" },
  { valor: "light", label: "Claro" },
  { valor: "auto", label: "Automático" },
];

// Troca o tema salvando a escolha (não só o resultado resolvido), pra
// "Automático" continuar acompanhando o sistema mesmo depois de recarregar
// a página — e escuta mudança do SO em tempo real enquanto "Automático"
// estiver ativo, sem precisar de reload.
export function ThemeToggle() {
  const [modo, setModo] = useState<ModoTema | null>(null);

  useEffect(() => {
    // Lê depois de montar (em vez de useState(() => localStorage...)) de
    // propósito: o servidor sempre renderiza sem nenhum botão destacado, e
    // ler o valor real já no primeiro render do cliente faria o React
    // destacar um botão diferente do que o HTML do servidor mostrou,
    // gerando erro de hidratação.
    const salvo = (localStorage.getItem(CHAVE) as ModoTema | null) ?? "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModo(salvo);
  }, []);

  useEffect(() => {
    if (modo !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const ouvir = () => aplicar("auto");
    mq.addEventListener("change", ouvir);
    return () => mq.removeEventListener("change", ouvir);
  }, [modo]);

  function escolher(novo: ModoTema) {
    setModo(novo);
    localStorage.setItem(CHAVE, novo);
    aplicar(novo);
  }

  return (
    <div className="inline-flex rounded-xl border border-border-strong bg-field p-1">
      {OPCOES.map((o) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => escolher(o.valor)}
          className={cx(
            "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
            modo === o.valor ? "bg-accent text-bg-deep" : "text-text-dim hover:text-text"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
