"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SairButton } from "@/components/sair-button";
import { LogoMark } from "@/components/logo-mark";
import { NotificacoesAvisos } from "@/components/notificacoes-avisos";
import { cx } from "@/components/ui";
import type { NotificacaoRevendedor } from "@/lib/avisos";
import {
  IconPainel,
  IconPessoas,
  IconPessoaMais,
  IconSacola,
  IconCaixa,
  IconGrafico,
  IconCamadas,
  IconEtiqueta,
  IconAjustes,
  IconAjuda,
  IconLivro,
  IconEscudo,
  IconPontos,
} from "@/components/nav-icons";
import { iniciais } from "@/lib/format";

const ITENS = [
  { href: "/painel", label: "Painel", icone: IconPainel },
  { href: "/clientes", label: "Clientes", icone: IconPessoas },
  { href: "/vendas", label: "Vendas", icone: IconSacola },
  { href: "/estoque", label: "Estoque", icone: IconCaixa },
  { href: "/relatorio", label: "Relatório", icone: IconGrafico },
];

const ITENS_GESTAO = [
  { href: "/plataformas", label: "Plataformas", icone: IconCamadas },
  { href: "/precificacao", label: "Precificação", icone: IconEtiqueta },
];

// Itens do menu inferior mobile que não cabem nas 4 abas fixas (Painel,
// Clientes, Vendas + o "+" central) — ficam atrás do "Mais", igual ao
// mockup. Administração entra condicionalmente logo abaixo, na hora de
// montar a lista (só quem é admin vê).
const MOBILE_MAIS_ITENS = [
  { href: "/estoque", label: "Estoque", icone: IconCaixa },
  { href: "/relatorio", label: "Relatório", icone: IconGrafico },
  { href: "/plataformas", label: "Plataformas", icone: IconCamadas },
  { href: "/precificacao", label: "Precificação", icone: IconEtiqueta },
  { href: "/configuracoes", label: "Configurações", icone: IconAjustes },
  { href: "/ajuda", label: "Ajuda", icone: IconAjuda },
];

function GrupoNav({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {titulo ? (
        <span className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-dim">{titulo}</span>
      ) : null}
      {children}
    </div>
  );
}

function ItemNav({
  href,
  label,
  Icone,
  ativo,
  pequeno = false,
  destaque = false,
}: {
  href: string;
  label: string;
  Icone: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  ativo: boolean;
  pequeno?: boolean;
  destaque?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cx(
        "flex items-center gap-3 rounded-lg px-3 font-medium transition",
        pequeno ? "py-2 text-sm" : "py-2.5 text-[15px]",
        ativo
          ? "bg-accent-soft font-semibold text-text"
          : destaque
            ? "text-accent hover:bg-surface-2"
            : pequeno
              ? "text-text-dim hover:bg-surface-2 hover:text-text"
              : "text-text-muted hover:bg-surface-2 hover:text-text"
      )}
    >
      <Icone className={cx(pequeno ? "h-[18px] w-[18px]" : "h-5 w-5", ativo && "text-accent")} />
      {label}
    </Link>
  );
}

export function NavShell({
  nome,
  ehAdmin = false,
  notificacoes = [],
  notificacoesNaoLidas = 0,
  children,
}: {
  nome: string;
  ehAdmin?: boolean;
  notificacoes?: NotificacaoRevendedor[];
  notificacoesNaoLidas?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-4 md:flex">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="text-base font-bold tracking-tight">GestorPro</span>
          </div>
          <NotificacoesAvisos notificacoes={notificacoes} naoLidos={notificacoesNaoLidas} />
        </div>

        <GrupoNav titulo="Operação">
          {ITENS.map((item) => (
            <ItemNav key={item.href} href={item.href} label={item.label} Icone={item.icone} ativo={pathname.startsWith(item.href)} />
          ))}
        </GrupoNav>

        <GrupoNav titulo="Gestão">
          {ITENS_GESTAO.map((item) => (
            <ItemNav key={item.href} href={item.href} label={item.label} Icone={item.icone} ativo={pathname.startsWith(item.href)} />
          ))}
          {ehAdmin ? (
            <ItemNav href="/admin" label="Administração" Icone={IconEscudo} ativo={pathname.startsWith("/admin")} destaque />
          ) : null}
        </GrupoNav>

        <div className="flex-1" />

        <GrupoNav>
          <ItemNav href="/configuracoes" label="Configurações" Icone={IconAjustes} ativo={pathname.startsWith("/configuracoes")} pequeno />
          <ItemNav href="/ajuda" label="Ajuda" Icone={IconAjuda} ativo={pathname.startsWith("/ajuda")} pequeno />
          <a
            href="/manual-revendedor.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-dim transition hover:bg-surface-2 hover:text-text"
          >
            <IconLivro className="h-[18px] w-[18px]" />
            Manual do app
          </a>
        </GrupoNav>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
            {iniciais(nome)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{nome}</span>
          <SairButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:pb-0">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="text-sm font-bold">GestorPro</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificacoesAvisos notificacoes={notificacoes} naoLidos={notificacoesNaoLidas} />
            {ehAdmin ? (
              <Link href="/admin" className="text-xs font-semibold text-accent">
                Admin
              </Link>
            ) : null}
            <Link href="/configuracoes" className="text-xs font-semibold text-text-dim">
              Config.
            </Link>
            <a
              href="/manual-revendedor.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-text-dim"
            >
              Manual
            </a>
            <SairButton />
          </div>
        </header>

        {/* pb-24 no mobile — sem isso, o conteúdo rolava até embaixo da barra
        inferior sticky e os últimos itens de listas (ex: fila de Clientes)
        ficavam parcialmente cobertos pelos botões da barra. */}
        <main className="flex-1 px-4 pb-24 pt-5 md:p-8">{children}</main>

        {/* sticky, não fixed — "fixed" no mobile se ancora no viewport "de
        layout" (o maior, contando a área da barra de endereço do
        navegador), não no que está realmente visível. Isso fazia essa
        barra flutuar bem abaixo da tela em vez de grudar no rodapé. */}
        <nav className="sticky inset-x-0 bottom-0 z-10 flex items-stretch border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          <TabMobile href="/painel" label="Painel" Icone={IconPainel} ativo={pathname.startsWith("/painel")} />
          <TabMobile href="/clientes" label="Clientes" Icone={IconPessoas} ativo={pathname.startsWith("/clientes")} />

          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => setNovoAberto((v) => !v)}
              aria-label="Nova ação"
              aria-expanded={novoAberto}
              className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg-deep shadow-lg shadow-accent/30 transition active:scale-95"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <TabMobile href="/vendas" label="Vendas" Icone={IconSacola} ativo={pathname.startsWith("/vendas")} />
          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-label="Mais opções"
            className={cx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold",
              maisAberto || MOBILE_MAIS_ITENS.some((i) => pathname.startsWith(i.href)) || (ehAdmin && pathname.startsWith("/admin"))
                ? "text-accent"
                : "text-text-dim"
            )}
          >
            <IconPontos className="h-5 w-5" />
            Mais
          </button>
        </nav>

        {novoAberto ? (
          <div className="fixed inset-0 z-20 md:hidden" onClick={() => setNovoAberto(false)}>
            <div className="absolute inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex flex-col gap-2 rounded-2xl border border-border-strong bg-surface p-2 shadow-2xl">
              <Link
                href="/clientes/novo"
                onClick={() => setNovoAberto(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text hover:bg-surface-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <IconPessoaMais className="h-5 w-5" />
                </span>
                Novo cliente
              </Link>
              <Link
                href="/vendas/nova"
                onClick={() => setNovoAberto(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text hover:bg-surface-2"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <IconSacola className="h-5 w-5" />
                </span>
                Nova venda
              </Link>
            </div>
          </div>
        ) : null}

        {maisAberto ? (
          <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setMaisAberto(false)}>
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border-strong bg-surface p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
              <div className="grid grid-cols-4 gap-y-4">
                {MOBILE_MAIS_ITENS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMaisAberto(false)}
                    className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-text-muted"
                  >
                    <span
                      className={cx(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        pathname.startsWith(item.href) ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-dim"
                      )}
                    >
                      <item.icone className="h-5 w-5" />
                    </span>
                    {item.label}
                  </Link>
                ))}
                {ehAdmin ? (
                  <Link
                    href="/admin"
                    onClick={() => setMaisAberto(false)}
                    className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-accent"
                  >
                    <span
                      className={cx(
                        "flex h-11 w-11 items-center justify-center rounded-xl",
                        pathname.startsWith("/admin") ? "bg-accent-soft" : "bg-surface-2"
                      )}
                    >
                      <IconEscudo className="h-5 w-5" />
                    </span>
                    Administração
                  </Link>
                ) : null}
                <a
                  href="/manual-revendedor.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-text-muted"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-text-dim">
                    <IconLivro className="h-5 w-5" />
                  </span>
                  Manual
                </a>
              </div>
              <div className="mt-5 flex justify-center border-t border-border pt-4">
                <SairButton className="text-sm font-semibold text-danger" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabMobile({
  href,
  label,
  Icone,
  ativo,
}: {
  href: string;
  label: string;
  Icone: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      className={cx("flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold", ativo ? "text-accent" : "text-text-dim")}
    >
      <Icone className="h-5 w-5" />
      {label}
    </Link>
  );
}
