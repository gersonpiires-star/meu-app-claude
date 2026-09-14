import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { LandingTabsShowcase } from "@/components/landing-tabs-showcase";
import { Badge, buttonClassName } from "@/components/ui";
import {
  PRECO_MENSAL,
  PRECO_SEMESTRAL,
  PRECO_SEMESTRAL_MENSALIZADO,
  PRECO_ANUAL,
  PRECO_ANUAL_MENSALIZADO,
} from "@/lib/planos-assinatura";
import { brl, brl0 } from "@/lib/format";

const PASSOS = [
  { n: "01", titulo: "Crie sua conta grátis", texto: "Sem cartão, sem compromisso — 7 dias pra testar tudo." },
  { n: "02", titulo: "Cadastre clientes e apps", texto: "Importa ou cadastra na mão, do seu jeito." },
  { n: "03", titulo: "Cobre, renove e acompanhe", texto: "O financeiro do seu negócio, sempre atualizado." },
];

const CONFIANCA = [
  "Dados sempre seus — exporte quando quiser",
  "Suporte direto pelo WhatsApp",
  "Sem fidelidade, cancele quando quiser",
  "Feito pra revenda de streaming, não adaptado de outro nicho",
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FeatureIcon({ d }: { d: string }) {
  return (
    <div className="mb-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-text">
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
        <section className="relative">
          {/* Grade de pontos bem sutil atrás do hero, esmaecendo nas bordas —
              só textura de fundo, não pode competir com o conteúdo. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(var(--color-border-strong)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_40%,transparent_100%)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 md:pb-24 md:pt-20">
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

              <div className="relative flex justify-center pb-8 pr-4 sm:pb-10 sm:pr-8">
                <div className="absolute h-72 w-72 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />

                {/* Cartão flutuante estilo notificação — sugere uma cobrança
                    resolvida sozinha, reforça a mensagem do produto sem
                    precisar de mais um screenshot. */}
                <div
                  className="absolute -left-3 top-2 z-20 hidden -rotate-6 items-center gap-2 rounded-xl border border-border-strong bg-surface px-3 py-2 shadow-xl sm:flex"
                  aria-hidden="true"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-bg-deep">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                      <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-text">Ana renovou · R$ 28</span>
                </div>

                {/* Notebook: tela com moldura grossa sobre uma base (deck do teclado)
                    nitidamente mais larga e clara que a tela, como um notebook aberto. */}
                <div className="relative w-full max-w-[440px] pb-3">
                  <div className="relative rounded-t-xl border-[10px] border-b-0 border-surface-2 bg-bg-deep shadow-2xl">
                    <span className="absolute left-1/2 top-[-5px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-bg" aria-hidden="true" />
                    <div className="overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/landing-preview-desktop.png" alt="Painel do GestorPro no computador" className="block w-full" />
                    </div>
                  </div>
                  <div
                    className="relative -mx-[9%] h-6 rounded-b-2xl border-t border-white/10 bg-surface-2 shadow-[0_10px_20px_-6px_rgba(0,0,0,0.6)]"
                    aria-hidden="true"
                  >
                    <span className="absolute left-1/2 top-1.5 h-1 w-16 -translate-x-1/2 rounded-full bg-bg-deep/50" />
                  </div>
                </div>

                {/* Celular sobreposto no canto, sugerindo o mesmo painel também no bolso */}
                <div className="absolute -bottom-6 -right-1 w-[92px] overflow-hidden rounded-[18px] border-[4px] border-surface-2 bg-bg-deep shadow-2xl sm:-right-3 sm:w-[112px]">
                  <div className="absolute left-1/2 top-0 z-10 h-2.5 w-11 -translate-x-1/2 rounded-b-md bg-surface-2" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/landing-preview.png" alt="Painel do GestorPro no celular" className="block w-full" />
                </div>
              </div>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-border pt-8">
              {CONFIANCA.map((c) => (
                <span key={c} className="flex items-center gap-2 text-xs font-medium text-text-dim">
                  <span className="text-accent">
                    <CheckIcon />
                  </span>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-center text-2xl font-bold text-text md:text-3xl">O GestorPro por dentro</h2>
            <p className="mt-2 text-center text-text-muted">Clica nas abas e vê exatamente como cada tela funciona.</p>
            <div className="mt-10">
              <LandingTabsShowcase />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold text-text md:text-3xl">Tudo que sua revenda precisa</h2>
            <p className="mt-2 max-w-xl text-text-muted">Sem depender de planilha, papel ou mensagem perdida no WhatsApp.</p>

            <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
                <h3 className="text-base font-bold text-text">Clientes organizados</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
                  Cadastro completo, renovação em 1 clique e nunca mais perde o controle de quem venceu ou tá vencendo.
                </p>
                <div className="mt-4 h-56 overflow-hidden rounded-xl border border-border-strong">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing-shot-clientes.png"
                    alt="Lista de clientes do GestorPro"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-base font-bold text-text">Cobrança automática</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Manda lembrete pelo WhatsApp com um clique — ou deixa o cliente pagar sozinho por Pix ou cartão.
                </p>
                <div className="mt-4 h-56 overflow-hidden rounded-xl border border-border-strong">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing-shot-cobranca.png"
                    alt="Vencimento e cobrança automática de um cliente"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
                <h3 className="text-base font-bold text-text">Financeiro completo</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
                  Relatório mês a mês com entrada, custo e lucro líquido de verdade, sem precisar de planilha.
                </p>
                <div className="mt-4 h-40 overflow-hidden rounded-xl border border-border-strong">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing-shot-relatorio.png"
                    alt="Relatório financeiro do mês"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-base font-bold text-text">Vendas e estoque</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Registra venda de aparelho com controle de estoque e custo real — sem chute na hora de saber o lucro.
                </p>
                <div className="mt-4 h-40 overflow-hidden rounded-xl border border-border-strong">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/landing-shot-vendas.png"
                    alt="Vendas de aparelhos com estoque"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M3 10h18M7 15h4M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                <h3 className="text-base font-bold text-text">Plataformas de crédito</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Controla o saldo de crédito de cada fornecedor e é avisado antes de ficar no vermelho.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
                <FeatureIcon d="M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
                <h3 className="text-base font-bold text-text">Funciona como app</h3>
                <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
                  Instala na tela do celular e usa como um aplicativo de verdade, com notificação de vencimento.
                </p>
              </div>
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
