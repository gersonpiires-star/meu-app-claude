"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SairButton } from "@/components/sair-button";
import { LogoMark } from "@/components/logo-mark";
import { cx } from "@/components/ui";

const ITENS = [
  { href: "/admin", label: "Painel" },
  {
    href: "/admin/assinantes",
    label: "Assinantes",
    sub: [
      { aba: "assinantes", label: "Ativos" },
      { aba: "trial", label: "Em trial" },
      { aba: "pausados", label: "Pausados" },
      { aba: "cancelados", label: "Cancelados" },
      { aba: "todos", label: "Todos" },
    ],
  },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/interessados", label: "Interessados" },
  { href: "/admin/comunicados", label: "Comunicados" },
  { href: "/admin/sugestoes", label: "Sugestões" },
];

function ChevronIcon({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cx("h-3.5 w-3.5 shrink-0 transition-transform", aberto ? "rotate-180" : "")}
    >
      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NavShellAdmin({ nome, children }: { nome: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [expandido, setExpandido] = useState<string | null>(
    ITENS.find((item) => item.sub && pathname === item.href)?.href ?? null
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <LogoMark className="h-8 w-8" />
          <div>
            <span className="block text-sm font-bold">GestorPro</span>
            <span className="block text-[10px] uppercase tracking-wider text-text-dim">Administrador</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITENS.map((item) => {
            const ativo = pathname === item.href;
            const estaAberto = item.sub ? expandido === item.href || ativo : false;

            if (!item.sub) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "rounded-lg px-3 py-2 text-sm font-medium transition",
                    ativo ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text"
                  )}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.href}>
                <div
                  className={cx(
                    "flex items-center gap-1 rounded-lg pr-2 text-sm font-medium transition",
                    ativo ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text"
                  )}
                >
                  <Link href={item.href} className="flex-1 px-3 py-2">
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setExpandido(estaAberto ? null : item.href)}
                    aria-label={estaAberto ? `Recolher ${item.label}` : `Expandir ${item.label}`}
                    className="p-1"
                  >
                    <ChevronIcon aberto={estaAberto} />
                  </button>
                </div>
                {estaAberto ? (
                  <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                    {item.sub.map((s) => (
                      <Link
                        key={s.aba}
                        href={`${item.href}?aba=${s.aba}`}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-text-dim transition hover:text-text"
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <Link
          href="/painel"
          className="rounded-lg px-3 py-2 text-sm font-medium text-accent transition hover:bg-surface-2"
        >
          Minha operação (revenda)
        </Link>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="truncate text-xs text-text-dim">{nome}</span>
          <SairButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col md:pb-0">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:hidden">
          <span className="text-sm font-bold">GestorPro · Admin</span>
          <div className="flex items-center gap-3">
            <Link href="/painel" className="text-xs font-semibold text-accent">
              Minha revenda
            </Link>
            <SairButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>

        <nav className="sticky inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
          {ITENS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex-1 py-2.5 text-center text-[11px] font-semibold",
                pathname === item.href ? "text-accent" : "text-text-dim"
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
