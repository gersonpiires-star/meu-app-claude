"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SairButton } from "@/components/sair-button";
import { LogoMark } from "@/components/logo-mark";
import { cx } from "@/components/ui";
import {
  IconPainel,
  IconPessoas,
  IconTag,
  IconPessoaMais,
  IconMegafone,
  IconLampada,
  IconPontos,
} from "@/components/nav-icons";
import { iniciais } from "@/lib/format";

const ITENS = [
  { href: "/admin", label: "Painel", icone: IconPainel },
  { href: "/admin/assinantes", label: "Assinantes", icone: IconPessoas },
  { href: "/admin/cupons", label: "Cupons", icone: IconTag },
  { href: "/admin/interessados", label: "Interessados", icone: IconPessoaMais },
];

const ITENS_GESTAO = [
  { href: "/admin/comunicados", label: "Comunicados", icone: IconMegafone },
  { href: "/admin/sugestoes", label: "Sugestões", icone: IconLampada },
];

// Na barra inferior do celular só cabem os 4 itens principais — o resto
// (Comunicados, Sugestões) fica atrás do "Mais".
const MOBILE_MAIS_ITENS = ITENS_GESTAO;

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
}: {
  href: string;
  label: string;
  Icone: (props: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  ativo: boolean;
  pequeno?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cx(
        "flex items-center gap-3 rounded-lg px-3 font-medium transition",
        pequeno ? "py-1.5 text-sm" : "py-2 text-[15px]",
        ativo
          ? "bg-accent-soft font-semibold text-text"
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

export function NavShellAdmin({ nome, children }: { nome: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const estaEmItemDoMais = MOBILE_MAIS_ITENS.some((item) => pathname === item.href);

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-3 border-r border-border bg-surface p-4 md:flex">
        <div className="flex items-center gap-2.5 px-1">
          <LogoMark className="h-8 w-8" />
          <div>
            <span className="block text-base font-bold tracking-tight">GestorPro</span>
            <span className="block text-[10px] uppercase tracking-wider text-text-dim">Administrador</span>
          </div>
        </div>

        <GrupoNav titulo="Gestão">
          {ITENS.map((item) => (
            <ItemNav key={item.href} href={item.href} label={item.label} Icone={item.icone} ativo={pathname === item.href} />
          ))}
          {ITENS_GESTAO.map((item) => (
            <ItemNav key={item.href} href={item.href} label={item.label} Icone={item.icone} ativo={pathname === item.href} />
          ))}
        </GrupoNav>

        <div className="flex-1" />

        <GrupoNav>
          <ItemNav href="/painel" label="Minha operação (revenda)" Icone={IconPainel} ativo={false} pequeno />
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
            <span className="text-sm font-bold">GestorPro · Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/painel" className="text-xs font-semibold text-accent">
              Minha revenda
            </Link>
            <SairButton />
          </div>
        </header>

        {/* pb-24 no mobile — sem isso, o conteúdo rolava até embaixo da barra
        inferior sticky e os últimos itens de listas ficavam parcialmente
        cobertos pelos botões da barra. */}
        <main className="flex-1 px-4 pb-24 pt-5 md:p-8">{children}</main>

        <nav className="sticky inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {ITENS.map((item) => {
            const ativo = pathname === item.href;
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
          <button
            type="button"
            onClick={() => setMaisAberto(true)}
            aria-label="Mais opções"
            className={cx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold",
              maisAberto || estaEmItemDoMais ? "text-accent" : "text-text-dim"
            )}
          >
            <IconPontos className="h-5 w-5" />
            Mais
          </button>
        </nav>

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
                        pathname === item.href ? "bg-accent-soft text-accent" : "bg-surface-2 text-text-dim"
                      )}
                    >
                      <item.icone className="h-5 w-5" />
                    </span>
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/painel"
                  onClick={() => setMaisAberto(false)}
                  className="flex flex-col items-center gap-1.5 text-center text-[11px] font-semibold text-accent"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2">
                    <IconPainel className="h-5 w-5" />
                  </span>
                  Minha revenda
                </Link>
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
