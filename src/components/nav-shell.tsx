"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SairButton } from "@/components/sair-button";
import { cx } from "@/components/ui";

const ITENS = [
  { href: "/painel", label: "Painel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/vendas", label: "Vendas" },
  { href: "/estoque", label: "Estoque" },
  { href: "/relatorio", label: "Relatório" },
];

export function NavShell({
  nome,
  children,
}: {
  nome: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-lg bg-accent" />
          <span className="text-sm font-bold">GestorPro</span>
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
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <span className="truncate text-xs text-text-dim">{nome}</span>
          <SairButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col pb-16 md:pb-0">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-accent" />
            <span className="text-sm font-bold">GestorPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/configuracoes" className="text-xs font-semibold text-text-dim">
              Config.
            </Link>
            <SairButton />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-surface md:hidden">
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
