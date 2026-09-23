"use client";

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
  IconSacola,
  IconCaixa,
  IconGrafico,
  IconCamadas,
  IconEtiqueta,
  IconAjustes,
  IconAjuda,
  IconLivro,
  IconEscudo,
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
            <ItemNav href="/administracao" label="Administração" Icone={IconEscudo} ativo={pathname.startsWith("/administracao")} destaque />
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
              <Link href="/administracao" className="text-xs font-semibold text-accent">
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

        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>

        {/* sticky, não fixed — "fixed" no mobile se ancora no viewport "de
        layout" (o maior, contando a área da barra de endereço do
        navegador), não no que está realmente visível. Isso fazia essa
        barra flutuar bem abaixo da tela em vez de grudar no rodapé. */}
        <nav className="sticky inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {ITENS.map((item) => {
            const ativo = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold",
                  ativo ? "text-accent" : "text-text-dim"
                )}
              >
                <item.icone className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
