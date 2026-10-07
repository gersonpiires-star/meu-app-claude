import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/logo-mark";
import { GUIAS } from "@/lib/guias";

export const metadata: Metadata = {
  title: "Guias para revenda de streaming — GestorPro",
  description: "Guias práticos sobre cobrança, controle de clientes e cálculo de lucro pra quem revende streaming/IPTV.",
};

export default function GuiasPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-semibold text-text-dim hover:text-text">
          <LogoMark className="h-6 w-6" />
          GestorPro
        </Link>

        <h1 className="text-2xl font-bold text-text">Guias para revenda de streaming</h1>
        <p className="mt-2 text-sm text-text-muted">
          Conteúdo prático sobre os problemas reais de quem revende IPTV/streaming — cobrança, controle de clientes e
          cálculo de lucro.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {GUIAS.map((g) => (
            <Link
              key={g.slug}
              href={`/guias/${g.slug}`}
              className="rounded-2xl border border-border-strong bg-surface p-5 transition hover:border-accent"
            >
              <h2 className="text-base font-bold text-text">{g.titulo}</h2>
              <p className="mt-1.5 text-sm text-text-muted">{g.resumo}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
