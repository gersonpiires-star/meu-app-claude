import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LogoMark } from "@/components/logo-mark";
import { buttonClassName } from "@/components/ui";
import { GUIAS, buscarGuia } from "@/lib/guias";

const BASE_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guia = buscarGuia(slug);
  if (!guia) return {};
  return {
    title: `${guia.titulo} — GestorPro`,
    description: guia.resumo,
    alternates: { canonical: `${BASE_URL}/guias/${guia.slug}` },
  };
}

export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guia = buscarGuia(slug);
  if (!guia) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guia.titulo,
    description: guia.resumo,
    publisher: { "@type": "Organization", name: "GestorPro", url: BASE_URL },
    mainEntityOfPage: `${BASE_URL}/guias/${guia.slug}`,
  };

  return (
    <main className="flex min-h-dvh flex-col items-center px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="w-full max-w-2xl">
        <Link href="/" className="mb-6 flex items-center gap-2 text-sm font-semibold text-text-dim hover:text-text">
          <LogoMark className="h-6 w-6" />
          GestorPro
        </Link>

        <Link href="/guias" className="text-xs font-semibold text-text-dim hover:text-text">
          ‹ Guias
        </Link>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-text">{guia.titulo}</h1>
        <p className="mt-2 text-sm text-text-muted">{guia.resumo}</p>

        <div className="mt-8 flex flex-col gap-7">
          {guia.secoes.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="text-base font-bold text-text">{secao.titulo}</h2>
              <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-text-muted">
                {secao.paragrafos.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-accent-strong bg-accent-soft/20 p-5 text-center">
          <p className="text-sm font-semibold text-text">Quer parar de controlar isso na mão?</p>
          <p className="mt-1 text-xs text-text-dim">7 dias grátis para testar o GestorPro, sem cartão.</p>
          <Link href="/cadastro" className={buttonClassName("primary", "mt-3 inline-flex")}>
            Criar conta grátis
          </Link>
        </div>
      </article>
    </main>
  );
}
