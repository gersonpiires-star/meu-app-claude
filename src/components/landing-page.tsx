import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { LandingTabsShowcase } from "@/components/landing-tabs-showcase";
import { Badge, ProgressRing, buttonClassName } from "@/components/ui";
import {
  PRECO_MENSAL,
  PRECO_SEMESTRAL,
  PRECO_SEMESTRAL_MENSALIZADO,
  PRECO_ANUAL,
  PRECO_ANUAL_MENSALIZADO,
} from "@/lib/planos-assinatura";
import { brl, brl0 } from "@/lib/format";

const WHATSAPP_SUPORTE = process.env.SUPORTE_WHATSAPP ?? "5500000000000";

const PASSOS = [
  { n: "1", titulo: "Crie sua conta grátis", texto: "Sem cartão de crédito. Você tem 7 dias pra testar tudo." },
  { n: "2", titulo: "Cadastre clientes e apps", texto: "Um por um ou importando a planilha que você já usa." },
  { n: "3", titulo: "Cobre, renove e acompanhe", texto: "O Painel mostra quem cobrar hoje e quanto você lucrou." },
];

const TRUST_CARDS = [
  {
    titulo: "Seus dados são seus",
    texto: "Exporte tudo quando quiser",
    icone: "M12 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm0 0v7m-4-3h8M5 21h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2Z",
  },
  {
    titulo: "Suporte no WhatsApp",
    texto: "Fala direto com a gente",
    icone: "M4 20l1.4-4.2A8 8 0 1 1 9 18.8L4 20Z",
  },
  {
    titulo: "Sem fidelidade",
    texto: "Cancele quando quiser",
    icone: "M6 6l12 12M18 6 6 18",
  },
  {
    titulo: "Feito pra revenda",
    texto: "De streaming, do seu jeito",
    icone: "M4 6h16M4 12h16M4 18h10",
  },
];

const SEM_GESTORPRO = [
  "Cliente anotado no caderno ou em planilha",
  "Cobrança esquecida no meio das conversas",
  "Não sabe quanto lucrou no mês",
  "Crédito acaba sem aviso",
];

const COM_GESTORPRO = [
  "Todos os clientes com vencimento na tela",
  "Fila de quem cobrar hoje, mensagem pronta",
  "Lucro líquido e previsão do próximo mês",
  "Alerta antes de faltar crédito do aparelho",
];

const PLANO_CHECKLIST = [
  "Clientes ilimitados",
  "Cobrança pelo WhatsApp",
  "Financeiro e relatórios",
  "Vendas e estoque",
  "Plataformas de crédito",
  "Suporte no WhatsApp",
];

const FILA_PREVIEW = [
  { iniciais: "EV", nome: "Evandro Xuxu", dias: "21 dias vencido" },
  { iniciais: "FT", nome: "Fê Tlug", dias: "21 dias vencido" },
  { iniciais: "GN", nome: "Gilson Nevez", dias: "19 dias vencido" },
];

const FAQ = [
  {
    pergunta: "Preciso de cartão de crédito para testar?",
    resposta: "Não. Você tem 7 dias grátis pra testar tudo, sem precisar cadastrar cartão.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta: "Sim, cancele quando quiser, sem multa e sem fidelidade. Seus dados continuam guardados caso queira voltar depois.",
  },
  {
    pergunta: "Funciona no celular?",
    resposta: "Funciona como um app de verdade — instala na tela inicial do celular (sem loja de aplicativo) e recebe notificação de vencimento.",
  },
  {
    pergunta: "Consigo levar meus clientes da planilha?",
    resposta: "Sim, dá pra importar sua planilha ou cadastrar cliente por cliente na mão, do seu jeito.",
  },
  {
    pergunta: "O GestorPro envia as mensagens sozinho?",
    resposta:
      "Sim, se você conectar seu WhatsApp: o app manda lembrete de vencimento e cobrança automaticamente, nos dias que você escolher.",
  },
];

function CheckIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <span className="mb-3 inline-flex items-center rounded-full border border-accent-strong bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
      {children}
    </span>
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
                  Sua revenda de streaming, sempre <span className="text-accent">cobrando em dia</span>.
                </h1>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-text-muted">
                  Saiba quem venceu, cobre pelo WhatsApp com um toque e veja quanto entrou no fim do mês. Clientes,
                  vendas, estoque e créditos num só lugar.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/cadastro" className={buttonClassName("primary", "px-7 py-3.5 text-base")}>
                    Testar grátis por 7 dias
                  </Link>
                  <Link href="/entrar" className="text-sm font-semibold text-text-dim hover:text-text">
                    Já tenho conta →
                  </Link>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-text-dim">
                  <span className="flex items-center gap-1.5">
                    <span className="text-accent">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    Sem cartão
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-accent">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    Cancele quando quiser
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-accent">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    Suporte no WhatsApp
                  </span>
                </div>
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
                    <CheckIcon className="h-3.5 w-3.5" />
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
          </div>
        </section>

        <section className="border-t border-border py-10">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TRUST_CARDS.map((c) => (
                <div key={c.titulo} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5">
                      <path d={c.icone} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-tight text-text">{c.titulo}</p>
                    <p className="mt-0.5 text-xs leading-tight text-text-dim">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <Eyebrow>Antes e depois</Eyebrow>
            <h2 className="text-2xl font-bold text-text md:text-3xl">Chega de revenda no caderno</h2>
            <p className="mt-2 max-w-xl text-text-muted">
              O que muda quando tudo que você controla de cabeça passa a estar numa tela só.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="text-sm font-bold text-text-dim">Sem o GestorPro</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {SEM_GESTORPRO.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-text-muted">
                      <span className="mt-0.5 text-danger">
                        <XIcon />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-accent bg-accent-soft/20 p-6">
                <h3 className="text-sm font-bold text-accent">Com o GestorPro</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {COM_GESTORPRO.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-text">
                      <span className="mt-0.5 text-accent">
                        <CheckIcon />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <Eyebrow>Funcionalidades</Eyebrow>
            <h2 className="text-2xl font-bold text-text md:text-3xl">Tudo que sua revenda precisa</h2>
            <p className="mt-2 max-w-xl text-text-muted">Sem depender de planilha, papel ou mensagem perdida no WhatsApp.</p>

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M3 5h18v14H3V5Zm0 0 9 7 9-7" />
                <h3 className="text-base font-bold text-text">Cobrança pelo WhatsApp</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Mensagem pronta com nome, plano, valor e sua chave Pix. Um toque e ela sai. Cobre vários de uma vez.
                </p>
                <div className="mt-4 rounded-xl border border-border-strong bg-bg-deep p-3">
                  <div className="rounded-lg bg-accent-soft px-3 py-2 text-xs leading-relaxed text-text">
                    Oi Evandro! Seu plano Mensal vence em 02/09. Pra renovar, é só fazer o Pix de R$ 60,00 e me
                    mandar o comprovante. Obrigado!
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-accent">
                    <CheckIcon className="h-3 w-3" /> Cobrança enviada para Evandro
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 0a4 4 0 0 0 0-8m3 18v-2a4 4 0 0 0-3-3.87" />
                <h3 className="text-base font-bold text-text">Clientes organizados</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Cadastro completo, vencimento de cada um e renovação com um clique. Nunca mais cliente esquecido.
                </p>
              </div>

              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M4 20V10M10 20V4M16 20v-7M4 20h16" />
                <h3 className="text-base font-bold text-text">Financeiro completo</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Entrou, custou, sobrou o lucro líquido do mês, a previsão do próximo e a meta com progresso.
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-strong bg-bg-deep p-3">
                  <ProgressRing pct={43} size={48} espessura={5}>
                    <span className="text-[10px] font-bold text-text">43%</span>
                  </ProgressRing>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Lucro do mês</p>
                    <p className="text-lg font-bold text-money">R$ 670</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M3 7l9-4 9 4-9 4-9-4Zm0 0v10l9 4m0-14v14m9-14v10l-9 4" />
                <h3 className="text-base font-bold text-text">Vendas e estoque</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Venda de aparelhos com controle de estoque e alerta quando for hora de repor.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M12 3 2 8l10 5 10-5-10-5Zm-10 8 10 5 10-5M2 16l10 5 10-5" />
                <h3 className="text-base font-bold text-text">Plataformas de crédito</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Saldo de créditos de cada painel que você revende, com aviso antes de acabar.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6">
                <FeatureIcon d="M10 21a2 2 0 0 0 4 0M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" />
                <h3 className="text-base font-bold text-text">Funciona como app</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Instala no celular, recebe notificações e usa no dia a dia como qualquer aplicativo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="text-center">
              <Eyebrow>Por dentro</Eyebrow>
              <h2 className="text-2xl font-bold text-text md:text-3xl">Veja como é o GestorPro</h2>
              <p className="mt-2 text-text-muted">
                O Painel que você vai abrir todo dia: quanto entrou, quanto sobrou e quem cobrar.
              </p>
            </div>
            <div className="mt-10">
              <LandingTabsShowcase />
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <Eyebrow>Como funciona</Eyebrow>
            <h2 className="text-2xl font-bold text-text md:text-3xl">Comece em 5 minutos</h2>
            <p className="mt-2 max-w-xl text-text-muted">
              Sem instalação, sem treinamento. Se você usa WhatsApp, você usa o GestorPro.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {PASSOS.map((p) => (
                <div key={p.n} className="rounded-2xl border border-border bg-surface p-6">
                  <span className="text-3xl font-extrabold text-accent-strong">{p.n}</span>
                  <h3 className="mt-2 text-base font-bold text-text">{p.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <Eyebrow>Preços</Eyebrow>
            <h2 className="text-2xl font-bold text-text md:text-3xl">Um preço simples, tudo incluso</h2>
            <p className="mt-2 max-w-xl text-text-muted">
              Teste 7 dias grátis. Depois escolha o plano que caiba no seu bolso.
            </p>
            <div className="mx-auto mt-10 grid max-w-4xl items-start gap-5 sm:grid-cols-3">
              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <span className="text-sm font-bold text-text">Mensal</span>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-text">{brl(PRECO_MENSAL)}</span>
                  <span className="text-sm text-text-dim"> por mês</span>
                  <p className="mt-1 text-xs text-text-dim">Cancele quando quiser</p>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {PLANO_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                      <span className="text-accent">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro" className={buttonClassName("outline", "mt-6 w-full justify-center")}>
                  Testar grátis primeiro
                </Link>
              </div>

              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-text">Semestral</span>
                  <Badge tone="accent">10% de desconto</Badge>
                </div>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-text">{brl0(PRECO_SEMESTRAL_MENSALIZADO)}</span>
                  <span className="text-sm text-text-dim"> por mês</span>
                  <p className="mt-1 text-xs text-text-dim">{brl(PRECO_SEMESTRAL)} a cada 6 meses</p>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {PLANO_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-text-muted">
                      <span className="text-accent">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro" className={buttonClassName("outline", "mt-6 w-full justify-center")}>
                  Testar grátis primeiro
                </Link>
              </div>

              <div className="relative flex flex-col rounded-2xl border-2 border-accent bg-accent-soft/30 p-6 shadow-[0_0_0_4px_rgba(46,230,197,0.08)]">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-bg-deep">
                  2 meses grátis
                </span>
                <span className="text-sm font-bold text-text">Anual</span>
                <div className="mt-3">
                  <span className="text-4xl font-extrabold text-accent">{brl0(PRECO_ANUAL_MENSALIZADO)}</span>
                  <span className="text-sm text-text-dim"> por mês</span>
                  <p className="mt-1 text-xs text-text-dim">{brl(PRECO_ANUAL)} por ano</p>
                </div>
                <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                  {PLANO_CHECKLIST.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-medium text-text">
                      <span className="text-accent">
                        <CheckIcon className="h-4 w-4" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro" className={buttonClassName("primary", "mt-6 w-full justify-center")}>
                  Testar grátis primeiro
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-20">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 md:grid-cols-[280px_1fr]">
            <div>
              <Eyebrow>Dúvidas</Eyebrow>
              <h2 className="text-2xl font-bold text-text md:text-3xl">Perguntas frequentes</h2>
              <p className="mt-2 text-text-muted">Não achou sua dúvida? Chama a gente no WhatsApp.</p>
            </div>
            <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
              {FAQ.map((f) => (
                <details key={f.pergunta} className="group px-5 py-4 open:pb-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-text marker:content-none">
                    {f.pergunta}
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-text-dim transition group-open:rotate-180">
                      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <p className="mt-2.5 text-sm leading-relaxed text-text-muted">{f.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 md:py-24">
          <div className="mx-auto max-w-5xl px-5">
            <div className="flex flex-col items-center gap-8 rounded-3xl border border-border bg-surface p-8 md:flex-row md:items-center md:justify-between md:p-10">
              <div className="flex flex-col items-center gap-4 text-center md:items-start md:text-left">
                <h2 className="text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
                  Pronto para organizar sua revenda?
                </h2>
                <p className="max-w-sm text-text-muted">Crie sua conta em 1 minuto. 7 dias grátis, sem cartão de crédito.</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/cadastro" className={buttonClassName("primary", "px-7 py-3.5 text-base")}>
                    Cadastre-se e teste grátis
                  </Link>
                  <a
                    href={`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent("Oi! Quero saber mais sobre o GestorPro.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClassName("ghost", "px-7 py-3.5 text-base")}
                  >
                    Falar no WhatsApp
                  </a>
                </div>
              </div>

              <div className="w-full max-w-xs shrink-0 rounded-2xl border border-border-strong bg-surface-2 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-text">Fila de cobrança</span>
                  <Badge tone="danger">6 vencidos</Badge>
                </div>
                <div className="flex flex-col gap-2.5">
                  {FILA_PREVIEW.map((c) => (
                    <div key={c.nome} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
                          {c.iniciais}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-text">{c.nome}</p>
                          <p className="truncate text-[10px] text-danger">{c.dias}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-[10px] font-bold text-bg-deep">Cobrar</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-text-dim sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark className="h-4 w-4" />
            <span>GestorPro</span>
            <span className="hidden sm:inline">— Gestão de clientes, vendas e estoque para revenda de streaming.</span>
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <Link href="/entrar" className="hover:text-text">
              Entrar
            </Link>
            <Link href="/cadastro" className="hover:text-text">
              Criar conta
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent("Oi! Quero saber mais sobre o GestorPro.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
