"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { dataPorExtenso, brl0 } from "@/lib/format";
import { marcarAvisosLidos } from "@/app/(app)/avisos-actions";
import { cx } from "@/components/ui";
import type { NotificacaoRevendedor } from "@/lib/avisos";

const LARGURA_PAINEL = 320;
const MARGEM = 8;

function IconeSino({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M18 16v-5a6 6 0 1 0-12 0v5l-1.6 2.4A1 1 0 0 0 5.24 20h13.52a1 1 0 0 0 .84-1.6L18 16Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.5 20a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ItemNotificacao({ item }: { item: NotificacaoRevendedor }) {
  const conteudo =
    item.tipo === "COMUNICADO" ? (
      <>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-text">{item.titulo}</p>
          {!item.lido ? <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-xs text-text-muted">{item.mensagem}</p>
      </>
    ) : (
      <>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-text">💰 Pagamento recebido</p>
          {!item.lido ? <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {item.clienteNome} pagou {brl0(item.valor)} pelo link — a renovação já foi registrada.
        </p>
      </>
    );

  return (
    <div className="px-4 py-3">
      {item.tipo === "PAGAMENTO" && item.clienteId ? (
        <Link href={`/clientes/${item.clienteId}`} className="block hover:opacity-90">
          {conteudo}
        </Link>
      ) : (
        conteudo
      )}
      <p className="mt-1.5 text-[11px] text-text-dim">{dataPorExtenso(item.criadoEm)}</p>
    </div>
  );
}

export function NotificacoesAvisos({
  notificacoes,
  naoLidos,
  className,
}: {
  notificacoes: NotificacaoRevendedor[];
  naoLidos: number;
  className?: string;
}) {
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const [naoLidosLocal, setNaoLidosLocal] = useState(naoLidos);
  const [, iniciarTransicao] = useTransition();

  // position: fixed calculado na hora de abrir (não depende de CSS absolute),
  // porque o sininho fica dentro de um menu com overflow-y-auto — e o
  // navegador, quando só um eixo tem overflow definido, calcula o outro
  // como "auto" também (regra do CSS), cortando um dropdown absolute que
  // ultrapasse a largura do menu.
  function abrir() {
    const rect = botaoRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.min(Math.max(rect.right - LARGURA_PAINEL, MARGEM), window.innerWidth - LARGURA_PAINEL - MARGEM);
      setPosicao({ top: rect.bottom + 8, left });
    }
    if (naoLidosLocal > 0) {
      setNaoLidosLocal(0);
      iniciarTransicao(() => marcarAvisosLidos());
    }
  }

  const aberto = posicao !== null;

  return (
    <div className={cx("relative", className)}>
      <button
        ref={botaoRef}
        onClick={() => (aberto ? setPosicao(null) : abrir())}
        aria-label="Notificações"
        className="relative z-50 flex h-8 w-8 items-center justify-center rounded-lg text-text-dim transition hover:bg-surface-2 hover:text-text"
      >
        <IconeSino className="h-5 w-5" />
        {naoLidosLocal > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-bg-deep">
            {naoLidosLocal > 9 ? "9+" : naoLidosLocal}
          </span>
        ) : null}
      </button>

      {aberto && posicao ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPosicao(null)} />
          <div
            style={{ top: posicao.top, left: posicao.left, width: LARGURA_PAINEL }}
            className="fixed z-50 flex max-h-96 max-w-[85vw] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-bold text-text">Notificações</p>
              <p className="text-xs text-text-dim">Comunicados e pagamentos recebidos pelo link</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notificacoes.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-text-dim">Nenhuma notificação ainda.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {notificacoes.map((item) => (
                    <ItemNotificacao key={`${item.tipo}-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
