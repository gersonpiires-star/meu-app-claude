"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Indica visualmente que a lista de abas rola pro lado — sem isso dava pra
// não perceber que existem mais categorias além das que cabem na tela (ex:
// "Aparência", "Conta e segurança" e "Backup e dados" ficavam cortadas na
// borda direita sem nenhum sinal de que dava pra arrastar). Os véus só
// aparecem quando realmente sobra conteúdo escondido daquele lado — dono
// (6 categorias) normalmente vê os dois em algum momento, funcionário (4,
// menos itens) pode nem chegar a ver nenhum se tudo já couber na tela.
export function AbasRolaveis({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [temEsquerda, setTemEsquerda] = useState(false);
  const [temDireita, setTemDireita] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function atualizar() {
      if (!el) return;
      setTemEsquerda(el.scrollLeft > 4);
      setTemDireita(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    atualizar();
    el.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    return () => {
      el.removeEventListener("scroll", atualizar);
      window.removeEventListener("resize", atualizar);
    };
  }, []);

  return (
    <div className="relative md:hidden">
      <nav ref={ref} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {children}
      </nav>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-bg to-transparent transition-opacity ${temEsquerda ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-bg to-transparent transition-opacity ${temDireita ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
