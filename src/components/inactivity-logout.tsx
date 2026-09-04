"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const CHAVE_ULTIMA_ATIVIDADE = "gestorpro:ultimaAtividade";
const EVENTOS_ATIVIDADE = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"] as const;

// Desloga sozinho depois de X minutos sem nenhuma interação — protege quem
// esquece o celular/PC aberto e logado. A última atividade fica no
// localStorage (não só em memória) pra abas diferentes da mesma sessão se
// enxergarem: mexendo em uma aba, uma segunda aba parada ao lado não desloga.
export function InactivityLogout({ minutos = 5 }: { minutos?: number }) {
  const limiteMs = minutos * 60 * 1000;
  const ultimaAtividadeRef = useRef(0);

  useEffect(() => {
    ultimaAtividadeRef.current = Date.now();

    function registrarAtividade() {
      const agora = Date.now();
      // Throttle — não precisa gravar a cada pixel de mousemove, a
      // checagem por polling abaixo não precisa de mais precisão que isso.
      if (agora - ultimaAtividadeRef.current < 5000) return;
      ultimaAtividadeRef.current = agora;
      try {
        localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(agora));
      } catch {
        // localStorage bloqueado (ex: aba anônima restrita) — o timeout
        // ainda funciona só que sem sincronizar entre abas.
      }
    }

    function checarInatividade() {
      let ultima = ultimaAtividadeRef.current;
      try {
        const salvo = localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE);
        if (salvo) ultima = Math.max(ultima, Number(salvo));
      } catch {
        // segue só com o valor local desta aba
      }
      if (Date.now() - ultima >= limiteMs) {
        signOut({ redirectTo: "/entrar" });
      }
    }

    registrarAtividade();
    EVENTOS_ATIVIDADE.forEach((ev) => window.addEventListener(ev, registrarAtividade, { passive: true }));
    document.addEventListener("visibilitychange", checarInatividade);

    const intervalo = setInterval(checarInatividade, 15000);

    return () => {
      EVENTOS_ATIVIDADE.forEach((ev) => window.removeEventListener(ev, registrarAtividade));
      document.removeEventListener("visibilitychange", checarInatividade);
      clearInterval(intervalo);
    };
  }, [limiteMs]);

  return null;
}
