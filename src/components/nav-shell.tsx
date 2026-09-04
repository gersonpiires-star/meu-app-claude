"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SairButton } from "@/components/sair-button";
import { LogoMark } from "@/components/logo-mark";
import { NotificacoesAvisos } from "@/components/notificacoes-avisos";
import { cx } from "@/components/ui";
import type { NotificacaoRevendedor } from "@/lib/avisos";

const ITENS = [
  { href: "/painel", label: "Painel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/vendas", label: "Vendas" },
  { href: "/estoque", label: "Estoque" },
  { href: "/relatorio", label: "Relatório" },
];

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

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-sm font-bold">GestorPro</span>
          </div>
          <NotificacoesAvisos notificacoes={notificacoes} naoLidos={notificacoesNaoLidas} />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                pathname.startsWith(item.href)
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/configuracoes"
          className={cx(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            pathname.startsWith("/configuracoes")
              ? "bg-accent-soft text-accent"
              : "text-text-muted hover:bg-surface-2 hover:text-text"
          )}
        >
          Configurações
        </Link>
        <Link
          href="/plataformas"
          className={cx(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            pathname.startsWith("/plataformas")
              ? "bg-accent-soft text-accent"
              : "text-text-muted hover:bg-surface-2 hover:text-text"
          )}
        >
          Plataformas
        </Link>
        <Link
          href="/precificacao"
          className={cx(
            "rounded-lg px-3 py-2 text-sm font-medium transition",
            pathname.startsWith("/precificacao")
              ? "bg-accent-soft text-accent"
              : "text-text-muted hover:bg-surface-2 hover:text-text"
          )}
        >
          Precificação
        </Link>
        {ehAdmin ? (
          <Link
            href="/admin"
            className="rounded-lg px-3 py-2 text-sm font-medium text-accent transition hover:bg-surface-2"
          >
            Administração GestorPro
          </Link>
        ) : null}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="truncate text-xs text-text-dim">{nome}</span>
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
            <SairButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>

        {/* sticky, não fixed — "fixed" no mobile se ancora no viewport "de
        layout" (o maior, contando a área da barra de endereço do
        navegador), não no que está realmente visível. Isso fazia essa
        barra flutuar bem abaixo da tela em vez de grudar no rodapé. */}
        <nav className="sticky inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex-1 py-2.5 text-center text-[11px] font-semibold",
                pathname.startsWith(item.href) ? "text-accent" : "text-text-dim"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
