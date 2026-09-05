import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { Badge, buttonClassName } from "@/components/ui";
import {
  PRECO_MENSAL,
  PRECO_SEMESTRAL,
  PRECO_SEMESTRAL_MENSALIZADO,
  PRECO_ANUAL,
  PRECO_ANUAL_MENSALIZADO,
} from "@/lib/planos-assinatura";
import { brl, brl0 } from "@/lib/format";

const RECURSOS = [
  {
    titulo: "Cobrança automática",
    texto: "Manda lembrete e cobrança pelo WhatsApp com um clique — ou deixa o cliente pagar sozinho por Pix ou cartão.",
  },
  {
    titulo: "Clientes organizados",
    texto: "Cadastro completo, renovação em 1 clique e nunca mais perde o controle de quem venceu ou tá vencendo.",
  },
  {
    titulo: "Vendas e estoque",
    texto: "Registra venda de aparelho com controle de estoque e custo real — sem chute na hora de saber o lucro.",
  },
  {
    titulo: "Financeiro completo",
    texto: "Relatório mês a mês com entrada, custo e lucro líquido de verdade, sem precisar de planilha.",
  },
  {
    titulo: "Plataformas de crédito",
    texto: "Controla o saldo de crédito de cada fornecedor e é avisado antes de ficar no vermelho.",
  },
  {
    titulo: "Funciona como app",
    texto: "Instala na tela do celular e usa como um aplicativo de verdade, com notificação de vencimento.",
  },
];

const PASSOS = [
  { n: "01", titulo: "Crie sua conta grátis", texto: "Sem cartão, sem compromisso — 7 dias pra testar tudo." },
  { n: "02", titulo: "Cadastre clientes e apps", texto: "Importa ou cadastra na mão, do seu jeito." },
  { n: "03", titulo: "Cobre, renove e acompanhe", texto: "O financeiro do seu negócio, sempre atualizado." },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-8 w-8" />
            <span className="text-base font-bold">GestorPro</span>
          </div>
          <Link href="/entrar" className={buttonClassName("ghost")}>
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent-strong bg-accent-soft px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                7 dias grátis · sem cartão
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-text md:text-5xl">
                Sua revenda de <span className="text-accent">streaming</span>, finalmente organizada.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-text-muted">
                Clientes, cobrança automática, vendas de aparelho e financeiro completo — tudo num só app,
                feito pra quem revende streaming.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/cadastro" className={buttonClassName("primary", "px-7 py-3.5 text-base")}>
                  Testar grátis agora
                </Link>
                <Link href="/entrar" className="text-sm font-semibold text-text-dim hover:text-text">
                  Já tenho conta →
                </Link>
              </div>
              <p className="mt-4 text-xs text-text-dim">Sem cartão de crédito · cancele quando quiser</p>
            </div>

            <div className="relative flex justify-center">
              <div className="absolute h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
              <div className="relative w-[240px] overflow-hidden rounded-[32px] border-[5px] border-surface-2 bg-bg-deep shadow-2xl">
                <div className="absolute left-1/2 top-0 z-10 h-4 w-24 -translate-x-1/2 rounded-b-xl bg-surface-2" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing-preview.png" alt="Painel do GestorPro no celular" className="block w-full" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold text-text md:text-3xl">Tudo que sua revenda precisa</h2>
            <p className="mt-2 max-w-xl text-text-muted">Sem depender de planilha, papel ou mensagem perdida no WhatsApp.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {RECURSOS.map((r) => (
                <div key={r.titulo} className="rounded-2xl border border-border bg-surface p-6">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                      <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-text">{r.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{r.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold text-text md:text-3xl">Como funciona</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.n}>
                  <span className="text-3xl font-extrabold text-accent-strong">{p.n}</span>
                  <h3 className="mt-2 text-base font-bold text-text">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold text-text md:text-3xl">Planos</h2>
            <p className="mt-2 max-w-xl text-text-muted">
              Comece com 7 dias grátis, sem cartão. Depois, escolha o plano que fizer sentido pra sua revenda.
            </p>
            <div className="mx-auto mt-10 grid max-w-4xl items-end gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <span className="text-sm font-bold text-text">Mensal</span>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-text">{brl(PRECO_MENSAL)}</span>
                  <p className="mt-1 text-xs text-text-dim">por mês · cancele quando quiser</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-text">Semestral</span>
                  <Badge tone="accent">10% de desconto</Badge>
                </div>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-text">{brl0(PRECO_SEMESTRAL_MENSALIZADO)}</span>
                  <p className="mt-1 text-xs text-text-dim">por mês · {brl(PRECO_SEMESTRAL)} à vista</p>
                </div>
              </div>

              <div className="relative rounded-2xl border-2 border-accent bg-accent-soft/30 p-6 shadow-[0_0_0_4px_rgba(46,230,197,0.08)] sm:scale-105">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-bg-deep">
                  Melhor custo-benefício
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-text">Anual</span>
                  <Badge tone="accent">2 meses grátis</Badge>
                </div>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-accent">{brl0(PRECO_ANUAL_MENSALIZADO)}</span>
                  <p className="mt-1 text-xs text-text-dim">por mês · {brl(PRECO_ANUAL)} à vista</p>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <Link href="/cadastro" className={buttonClassName("primary", "px-7 py-3.5 text-base")}>
                Testar grátis primeiro
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-5 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-text md:text-4xl">
              Pronto pra organizar sua revenda?
            </h2>
            <p className="max-w-md text-text-muted">
              Crie sua conta agora e teste todas as funções por 7 dias, de graça.
            </p>
            <Link href="/cadastro" className={buttonClassName("primary", "px-9 py-4 text-lg")}>
              Cadastre-se agora e teste grátis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-xs text-text-dim sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark className="h-4 w-4" />
            <span>GestorPro</span>
          </div>
          <span>Gestão de clientes, vendas e estoque para revenda de streaming.</span>
        </div>
      </footer>
    </div>
  );
}
