import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import {
  dadosAdmin,
  dadosCrescimento,
  receitaMensalAdmin,
  serieReceitaMesAdmin,
} from "@/lib/dados-admin";
import { rankingIndicacao } from "@/lib/indicacao";
import { limitesDoMes } from "@/lib/dados";
import { brl, brl0, dataCurta, diaCivilBr } from "@/lib/format";
import { diasParaVencer } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/mensagens";
import {
  Badge,
  Button,
  Card,
  Sparkline,
  StatTile,
  TrendChip,
} from "@/components/ui";
import { ReceitaPorMes } from "@/app/(app)/relatorio/receita-por-mes";
import { MarcarSugestaoLidaBotao } from "./marcar-sugestao-lida-botao";
import { EnviarCreditosForm } from "./enviar-creditos-form";
import { PublicarAvisoRapidoForm } from "./publicar-aviso-rapido-form";
import { MetaPlataformaCard } from "./meta-plataforma";
import { AdminTabs } from "./admin-tabs";

const PLANO_LABEL: Record<string, string> = {
  MENSAL: "Mensal",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

function statusConta(r: {
  statusAssinatura: string;
  pausadoEm: Date | null;
  trialFim: Date;
}): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (r.pausadoEm || r.statusAssinatura === "PAUSADO")
    return { label: "Bloqueada", tone: "danger" };
  if (r.statusAssinatura === "CANCELADO")
    return { label: "Cancelada", tone: "neutral" };
  if (r.statusAssinatura === "TRIAL") {
    const dias = Math.max(
      0,
      Math.ceil((r.trialFim.getTime() - Date.now()) / 86400000),
    );
    return { label: `Teste · ${dias}d`, tone: "warning" };
  }
  return { label: "Ativa", tone: "success" };
}

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const IconMoeda = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10 6.5v7M7.8 8.3c0-1 .9-1.8 2.2-1.8s2.2.6 2.2 1.5c0 2-4.4 1-4.4 3 0 .9 1 1.5 2.2 1.5s2.2-.7 2.2-1.7"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);
const IconEscudo = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path
      d="M10 2.5l6 2.2v4.3c0 4-2.6 6.9-6 8.5-3.4-1.6-6-4.5-6-8.5V4.7l6-2.2z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M7.2 10l1.9 1.9L13 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const IconTendencia = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path
      d="M3 13.5l4.5-4.5 3 3L17 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.5 5H17v4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default async function AdminPainelPage() {
  const admin = await exigirAdmin();
  const { inicio, fim } = limitesDoMes();
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);
  const [
    dados,
    crescimento,
    sugestoes,
    ranking,
    contas,
    creditosMes,
    receitaPorMes,
    serie,
  ] = await Promise.all([
    dadosAdmin(),
    dadosCrescimento(),
    prisma.sugestao.findMany({
      where: { lida: false },
      include: { revendedor: { select: { nome: true, email: true } } },
      orderBy: { criadoEm: "desc" },
      take: 10,
    }),
    rankingIndicacao(),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR" },
      orderBy: { criadoEm: "desc" },
      include: { _count: { select: { clientes: true } } },
    }),
    prisma.creditoConta.aggregate({
      where: { criadoEm: { gte: inicio, lt: fim } },
      _sum: { quantidade: true },
    }),
    receitaMensalAdmin(6),
    serieReceitaMesAdmin(agora),
  ]);
  const mrr =
    dados.previstoMensal + dados.previstoSemestral + dados.previstoAnual;
  const arr = mrr * 12;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-text">Painel do administrador</h1>

      <section
        aria-label="Resultado do mês"
        className="glow-card grid overflow-hidden rounded-2xl border bg-surface xl:grid-cols-[1fr_360px]"
      >
        <div className="flex min-w-0 flex-col gap-3 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text-muted">
              Entrou em {MESES[agoraCivil.mes]}
            </span>
            {serie.variacaoPct != null ? (
              <TrendChip
                pct={serie.variacaoPct}
                sufixo={`vs ${MESES[serie.mesAnteriorIdx]}`}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
            <p className="whitespace-nowrap text-4xl font-bold tracking-tight text-text md:text-5xl">
              <span className="text-lg font-semibold text-text-dim md:text-xl">
                R${" "}
              </span>
              {dados.receitaMes.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            {serie.acumulado.length >= 2 && dados.receitaMes > 0 ? (
              <div className="min-w-0 flex-1 pb-1">
                <Sparkline
                  valores={serie.acumulado}
                  width={460}
                  height={60}
                  className="h-[60px] w-full"
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-text-dim">
              Pagamentos{" "}
              <strong className="text-text">{dados.pagamentosMes}</strong>
            </span>
            <span className="text-text-dim">
              Receita bruta{" "}
              <strong className="text-money">
                {brl(dados.receitaBrutaMes)}
              </strong>
            </span>
            <span className="text-text-dim">
              Taxa MP{" "}
              <strong className="text-danger">− {brl(dados.taxaMpMes)}</strong>
            </span>
          </div>
          <p className="text-xs text-text-dim">
            Valor acima já é líquido (descontada a taxa do Mercado Pago).
          </p>
        </div>
        <div className="flex items-center border-t border-border bg-surface-2 p-5 xl:border-l xl:border-t-0">
          <MetaPlataformaCard
            meta={admin.metaReceitaPlataforma}
            receitaAtual={dados.receitaMes}
            diasRestantes={serie.diasRestantes}
          />
        </div>
      </section>

      <AdminTabs
        abas={[
          {
            id: "visao",
            label: "Visão geral",
            conteudo: (
              <>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                    Este mês
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatTile
                      label="Retenção"
                      value={`${dados.taxaRetencao.toFixed(0)}%`}
                      sub={`${dados.pausadosMes} pausado${dados.pausadosMes === 1 ? "" : "s"} este mês`}
                      tone={
                        dados.taxaRetencao >= 90
                          ? "accent"
                          : dados.taxaRetencao >= 75
                            ? "warning"
                            : "danger"
                      }
                      icon={IconEscudo}
                    />
                    <StatTile
                      label="MRR"
                      value={brl0(mrr)}
                      sub="receita recorrente mensal"
                      tone="accent"
                      icon={IconTendencia}
                    />
                    <StatTile
                      label="ARR"
                      value={brl0(arr)}
                      sub="MRR × 12"
                      icon={IconTendencia}
                    />
                  </div>
                </div>

                <Card>
                  <h2 className="mb-3 text-sm font-bold text-text">
                    Receita por mês
                  </h2>
                  <ReceitaPorMes meses={receitaPorMes} />
                </Card>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                    O que vem por aí
                  </p>
                  <Card className="glow-card border-accent-strong bg-accent-soft/20">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                      Previsto para {MESES[dados.proximoMes.getMonth()]}
                    </p>
                    <p className="mt-1 text-3xl font-bold text-accent">
                      {brl0(dados.previstoProxMes)}
                    </p>
                    <p className="mt-1 text-xs text-text-dim">
                      Receita prevista se todos os assinantes ativos continuarem
                    </p>

                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                          Planos mensais
                        </p>
                        <p className="mt-0.5 font-semibold text-text">
                          {brl0(dados.previstoMensal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                          Planos semestrais (mensalizado)
                        </p>
                        <p className="mt-0.5 font-semibold text-text">
                          {brl0(dados.previstoSemestral)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                          Planos anuais (mensalizado)
                        </p>
                        <p className="mt-0.5 font-semibold text-text">
                          {brl0(dados.previstoAnual)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-text-dim">
                      {dados.ativos} assinante{dados.ativos === 1 ? "" : "s"}{" "}
                      ativo{dados.ativos === 1 ? "" : "s"}
                      {dados.ativosSemPagamento > 0
                        ? ` (${dados.ativosSemPagamento} sem pagamento registrado, não entra na conta)`
                        : ""}
                    </p>
                  </Card>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatTile
                    label="Contas criadas"
                    value={String(dados.total)}
                  />
                  <StatTile label="Em trial" value={String(dados.trial)} />
                  <StatTile
                    label="Ativos"
                    value={String(dados.ativos)}
                    tone="accent"
                  />
                  <StatTile
                    label="Pausados"
                    value={String(dados.pausados)}
                    tone="warning"
                  />
                  <StatTile
                    label="Interessados em aberto"
                    value={String(dados.interessadosAbertos)}
                    sub={
                      dados.interessadosAbertos > 0
                        ? "aguardando retorno de contato"
                        : undefined
                    }
                    tone={dados.interessadosAbertos > 0 ? "warning" : "neutral"}
                  />
                  <StatTile
                    label="Cupons ativos"
                    value={String(dados.cuponsAtivos)}
                    sub="pra campanhas de venda"
                  />
                  <StatTile
                    label="Créditos enviados"
                    value={brl0(creditosMes._sum.quantidade ?? 0)}
                    sub="neste mês"
                    tone="money"
                    icon={IconMoeda}
                  />
                </div>
              </>
            ),
          },
          {
            id: "contas",
            label: "Contas",
            conteudo: (
              <>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                    Contas e créditos
                  </p>
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <Card className="overflow-x-auto p-0">
                      <div className="flex items-center justify-between border-b border-border p-4">
                        <h2 className="text-sm font-bold text-text">Contas</h2>
                        <span className="text-xs text-text-dim">
                          {contas.length} revendedor
                          {contas.length === 1 ? "" : "es"}
                        </span>
                      </div>
                      <div className="flex min-w-[640px] items-center gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                        <span className="min-w-0 flex-1">Conta</span>
                        <span className="w-24 shrink-0">Plano</span>
                        <span className="w-20 shrink-0 text-right">
                          Clientes
                        </span>
                        <span className="w-24 shrink-0 text-right">
                          Créditos
                        </span>
                        <span className="w-28 shrink-0 text-right">Status</span>
                      </div>
                      <div className="flex flex-col divide-y divide-border">
                        {contas.map((conta) => {
                          const status = statusConta(conta);
                          return (
                            <Link
                              key={conta.id}
                              href={`/admin/assinantes/${conta.id}`}
                              className="flex min-w-[640px] items-center gap-3 px-4 py-3 text-sm transition hover:bg-surface-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-text">
                                  {conta.nomeNegocio || conta.nome}
                                </p>
                                <p className="truncate text-xs text-text-dim">
                                  {conta.email}
                                </p>
                              </div>
                              <span className="w-24 shrink-0 text-text-muted">
                                {conta.planoAssinatura
                                  ? PLANO_LABEL[conta.planoAssinatura]
                                  : "Teste"}
                              </span>
                              <span className="w-20 shrink-0 text-right text-text-muted">
                                {conta._count.clientes}
                              </span>
                              <span className="w-24 shrink-0 text-right font-semibold text-money">
                                {brl0(conta.saldoCreditos)}
                              </span>
                              <span className="w-28 shrink-0 text-right">
                                <Badge tone={status.tone}>{status.label}</Badge>
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </Card>

                    <div className="flex flex-col gap-4">
                      <Card>
                        <h2 className="mb-3 text-sm font-bold text-text">
                          Enviar créditos
                        </h2>
                        <EnviarCreditosForm
                          contas={contas.map((c) => ({
                            id: c.id,
                            nome: c.nomeNegocio || c.nome,
                          }))}
                        />
                      </Card>

                      <Card>
                        <h2 className="mb-1 text-sm font-bold text-text">
                          Avisos do sistema
                        </h2>
                        <p className="mb-3 text-xs text-text-dim">
                          Mensagem para todas as contas ativas.
                        </p>
                        <PublicarAvisoRapidoForm />
                        <Link
                          href="/admin/comunicados"
                          className="mt-3 block text-xs font-semibold text-accent hover:underline"
                        >
                          Ver todos os comunicados →
                        </Link>
                      </Card>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                    Acesso ao app
                  </p>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatTile
                      label="Ativos nos últimos 7 dias"
                      value={String(dados.ativosUltimos7Dias)}
                      sub={`de ${dados.ativos + dados.trial + dados.pausados} contas não canceladas`}
                      tone="accent"
                    />
                    <StatTile
                      label="Ativos nos últimos 30 dias"
                      value={String(dados.ativosUltimos30Dias)}
                    />
                  </div>
                  {dados.semAcessoRecente.length > 0 ? (
                    <Card className="mt-3">
                      <h2 className="mb-1 text-sm font-bold text-text">
                        Assinantes sem acessar recentemente
                      </h2>
                      <p className="mb-3 text-xs text-text-dim">
                        Pagam em dia, mas não abrem o app há 14 dias ou mais —
                        sinal mais direto de que podem cancelar em breve. Vale
                        um contato antes que aconteça.
                      </p>
                      <div className="flex flex-col divide-y divide-border">
                        {dados.semAcessoRecente.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/admin/assinantes/${r.id}`}
                                className="block truncate text-sm font-semibold text-text hover:text-accent"
                              >
                                {r.nome}
                              </Link>
                              <p className="text-xs text-text-dim">
                                {r.diasSemAcesso === null
                                  ? "nunca acessou"
                                  : `sem acessar há ${r.diasSemAcesso}d`}
                              </p>
                            </div>
                            {r.whatsapp ? (
                              <a
                                href={linkWhatsApp(
                                  r.whatsapp,
                                  `Oi ${r.nome.split(" ")[0]}! Passando pra saber se está tudo certo com o GestorPro — precisa de alguma ajuda?`,
                                )}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Badge tone="warning">Chamar</Badge>
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : null}
                </div>

                {dados.pagamentosRecusados.length > 0 ? (
                  <Card>
                    <h2 className="mb-1 text-sm font-bold text-text">
                      Pagamentos recusados
                    </h2>
                    <p className="mb-3 text-xs text-text-dim">
                      Assinatura recusada pelo Mercado Pago nos últimos 7 dias —
                      dinheiro que quase entrou. Vale ajudar a tentar de novo
                      antes que o acesso pause.
                    </p>
                    <div className="flex flex-col divide-y divide-border">
                      {dados.pagamentosRecusados.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/admin/assinantes/${p.revendedor.id}`}
                              className="block truncate text-sm font-semibold text-text hover:text-accent"
                            >
                              {p.revendedor.nome}
                            </Link>
                            <p className="text-xs text-text-dim">
                              {brl0(p.valor)} recusado em{" "}
                              {dataCurta(p.atualizadoEm)}
                            </p>
                          </div>
                          {p.revendedor.whatsapp ? (
                            <a
                              href={linkWhatsApp(
                                p.revendedor.whatsapp,
                                `Oi ${p.revendedor.nome.split(" ")[0]}! Vi que o pagamento da sua assinatura do GestorPro não passou. Posso te ajudar a tentar de novo?`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Badge tone="danger">Chamar</Badge>
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {sugestoes.length > 0 ? (
                  <Card>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-text">
                        Sugestões dos usuários
                      </h2>
                      <div className="flex items-center gap-2">
                        <Badge tone="warning">
                          {sugestoes.length} nova
                          {sugestoes.length === 1 ? "" : "s"}
                        </Badge>
                        <Link
                          href="/admin/sugestoes"
                          className="text-xs font-semibold text-accent"
                        >
                          Ver todas
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-col divide-y divide-border">
                      {sugestoes.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-start justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text">
                              {s.revendedor.nome}
                            </p>
                            <p className="text-xs text-text-dim">
                              {s.revendedor.email}
                            </p>
                            <p className="mt-1 text-sm text-text">
                              {s.mensagem}
                            </p>
                            <p className="mt-1 text-xs text-text-dim">
                              {dataCurta(s.criadoEm)}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <MarcarSugestaoLidaBotao id={s.id} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {dados.trialsVencendo.length > 0 ? (
                  <Card>
                    <h2 className="mb-3 text-sm font-bold text-text">
                      Trials vencendo em breve
                    </h2>
                    <div className="flex flex-col divide-y divide-border">
                      {dados.trialsVencendo.map((r) => {
                        const dias = diasParaVencer(r.trialFim);
                        return (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-3 py-2"
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/admin/assinantes/${r.id}`}
                                className="block truncate text-sm font-semibold text-text hover:text-accent"
                              >
                                {r.nome}
                              </Link>
                              <p className="text-xs text-text-dim">
                                {dias < 0
                                  ? "trial expirado"
                                  : dias === 0
                                    ? "vence hoje"
                                    : `vence em ${dias}d`}
                              </p>
                            </div>
                            {r.whatsapp ? (
                              <a
                                href={linkWhatsApp(r.whatsapp)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Badge tone={dias <= 0 ? "danger" : "warning"}>
                                  Chamar
                                </Badge>
                              </a>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ) : null}
              </>
            ),
          },
          {
            id: "crescimento",
            label: "Crescimento",
            conteudo: (
              <>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                    Crescimento
                  </p>
                  <div className="flex flex-col gap-3">
                    <Card>
                      <h2 className="mb-3 text-sm font-bold text-text">
                        Funil — de lead a assinante pago
                      </h2>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-border bg-surface-2 p-3">
                          <p className="text-xl font-bold text-text">
                            {crescimento.trialsVencidosSemConverter.length}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                            Trial vencido
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-surface-2 p-3">
                          <p className="text-xl font-bold text-text">
                            {crescimento.totalRevendedores}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                            Criaram trial
                          </p>
                        </div>
                        <div className="rounded-xl border border-accent-strong bg-accent-soft p-3">
                          <p className="text-xl font-bold text-accent">
                            {crescimento.convertidos}
                          </p>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                            Viraram pago
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-dim">
                        <span>
                          Trial → pago:{" "}
                          <strong className="text-text">
                            {crescimento.taxaConversaoTrial.toFixed(0)}%
                          </strong>
                        </span>
                        {crescimento.diaMedioConversao != null ? (
                          <span>
                            Converte em média no dia{" "}
                            <strong className="text-text">
                              {crescimento.diaMedioConversao.toLocaleString(
                                "pt-BR",
                                { maximumFractionDigits: 1 },
                              )}
                            </strong>{" "}
                            do trial
                          </span>
                        ) : null}
                      </div>
                      {crescimento.convertidos > 0 ? (
                        <div className="mt-3 flex items-end gap-1 border-t border-border pt-3">
                          {crescimento.histogramaDias.map((h) => (
                            <div
                              key={h.dia}
                              className="flex flex-1 flex-col items-center gap-1"
                              title={`Dia ${h.dia === 7 ? "7+" : h.dia}: ${h.quantidade} conversão${h.quantidade === 1 ? "" : "ões"}`}
                            >
                              <div
                                className="w-full rounded-t-full transition-all hover:brightness-125"
                                style={{
                                  height: `${Math.max(4, (h.quantidade / Math.max(...crescimento.histogramaDias.map((x) => x.quantidade), 1)) * 40)}px`,
                                  background: "var(--chart-1)",
                                }}
                              />
                              <span className="text-[9px] text-text-dim">
                                {h.dia === 7 ? "7+" : h.dia}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </Card>

                    {ranking.length > 0 ? (
                      <Card className="p-0">
                        <div className="p-4 pb-0">
                          <h2 className="text-sm font-bold text-text">
                            Indicações — cliques no link
                          </h2>
                          <p className="mt-1 text-xs text-text-dim">
                            Quem mais divulga o link de indicação de verdade,
                            não só quem tem o link — cliques recebidos, quantos
                            viraram cadastro e quantos assinaram.
                          </p>
                        </div>
                        <div className="mt-3 flex flex-col divide-y divide-border">
                          {ranking.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                            >
                              <Link
                                href={`/admin/assinantes/${r.id}`}
                                className="min-w-0 flex-1 truncate font-semibold text-text hover:text-accent"
                              >
                                {r.nome}
                              </Link>
                              <div className="flex shrink-0 items-center gap-3 text-xs text-text-dim">
                                <span>
                                  {r.cliques} clique{r.cliques === 1 ? "" : "s"}
                                </span>
                                <span>
                                  {r.cadastros} cadastro
                                  {r.cadastros === 1 ? "" : "s"}
                                </span>
                                <Badge
                                  tone={r.assinantes > 0 ? "accent" : "neutral"}
                                >
                                  {r.assinantes} assinante
                                  {r.assinantes === 1 ? "" : "s"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {crescimento.trialsVencidosSemConverter.length > 0 ? (
                      <Card>
                        <h2 className="mb-1 text-sm font-bold text-text">
                          Trial vencido — não converteu
                        </h2>
                        <p className="mb-3 text-xs text-text-dim">
                          O teste grátis acabou e ainda não assinaram. Bom
                          momento pra tentar fidelizar com uma mensagem.
                        </p>
                        <div className="flex flex-col divide-y divide-border">
                          {crescimento.trialsVencidosSemConverter.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-3 py-2"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/assinantes/${r.id}`}
                                  className="block truncate text-sm font-semibold text-text hover:text-accent"
                                >
                                  {r.nome}
                                </Link>
                                <p className="text-xs text-text-dim">
                                  trial venceu em {dataCurta(r.trialFim)}
                                </p>
                              </div>
                              {r.whatsapp ? (
                                <a
                                  href={linkWhatsApp(
                                    r.whatsapp,
                                    `Oi ${r.nome.split(" ")[0]}! Seu período de teste do GestorPro venceu. Vamos renovar? Posso te ajudar a assinar agora.`,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Badge tone="warning">Chamar</Badge>
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {crescimento.assinantesEsfriando.length > 0 ? (
                      <Card>
                        <h2 className="mb-1 text-sm font-bold text-text">
                          Assinantes esfriando
                        </h2>
                        <p className="mb-3 text-xs text-text-dim">
                          Pagam em dia, mas pararam de usar o app — sinal de que
                          podem cancelar em breve. Vale um contato.
                        </p>
                        <div className="flex flex-col divide-y divide-border">
                          {crescimento.assinantesEsfriando.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-3 py-2"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/assinantes/${r.id}`}
                                  className="block truncate text-sm font-semibold text-text hover:text-accent"
                                >
                                  {r.nome}
                                </Link>
                                <p className="text-xs text-text-dim">
                                  {r.nuncaTeveAtividade
                                    ? "nunca usou o app"
                                    : `sem atividade há ${r.diasSemAtividade}d`}
                                </p>
                              </div>
                              {r.whatsapp ? (
                                <a
                                  href={linkWhatsApp(
                                    r.whatsapp,
                                    `Oi ${r.nome.split(" ")[0]}! Passando pra saber se está tudo certo com o GestorPro — precisa de alguma ajuda?`,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Badge tone="warning">Chamar</Badge>
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {crescimento.trialsEngajados.length > 0 ? (
                      <Card>
                        <h2 className="mb-1 text-sm font-bold text-text">
                          Trials engajados
                        </h2>
                        <p className="mb-3 text-xs text-text-dim">
                          Já estão usando de verdade — bom momento pra ajudar a
                          converter.
                        </p>
                        <div className="flex flex-col divide-y divide-border">
                          {crescimento.trialsEngajados.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-3 py-2"
                            >
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/assinantes/${r.id}`}
                                  className="block truncate text-sm font-semibold text-text hover:text-accent"
                                >
                                  {r.nome}
                                </Link>
                                <p className="text-xs text-text-dim">
                                  {r._count.clientes} cliente
                                  {r._count.clientes === 1 ? "" : "s"} ·{" "}
                                  {r._count.vendas} venda
                                  {r._count.vendas === 1 ? "" : "s"}
                                </p>
                              </div>
                              {r.whatsapp ? (
                                <a
                                  href={linkWhatsApp(r.whatsapp)}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Badge tone="accent">Chamar</Badge>
                                </a>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {crescimento.coorte.length > 0 ? (
                      <Card className="p-0">
                        <div className="p-4 pb-0">
                          <h2 className="text-sm font-bold text-text">
                            Coorte de retenção
                          </h2>
                          <p className="mt-1 text-xs text-text-dim">
                            De quem virou pagante em cada mês, quantos % ainda
                            estão ativos hoje.
                          </p>
                        </div>
                        <div className="mt-3 flex flex-col divide-y divide-border">
                          {crescimento.coorte.map((c) => (
                            <div
                              key={`${c.ano}-${c.mes}`}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm"
                            >
                              <span className="w-20 shrink-0 text-text-muted">
                                {MESES[c.mes].slice(0, 3)}/{c.ano}
                              </span>
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.max(2, c.retencaoPct)}%`,
                                    background:
                                      c.retencaoPct >= 75
                                        ? "var(--chart-1)"
                                        : c.retencaoPct >= 50
                                          ? "var(--chart-2)"
                                          : "var(--chart-3)",
                                  }}
                                />
                              </div>
                              <span className="w-16 shrink-0 text-right text-xs text-text-dim">
                                {c.aindaAtivos}/{c.total}
                              </span>
                              <Badge
                                tone={
                                  c.retencaoPct >= 75
                                    ? "accent"
                                    : c.retencaoPct >= 50
                                      ? "warning"
                                      : "danger"
                                }
                              >
                                {c.retencaoPct.toFixed(0)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}

                    {crescimento.cancelamentosRecentes.length > 0 ? (
                      <Card>
                        <h2 className="mb-3 text-sm font-bold text-text">
                          Motivos de cancelamento
                        </h2>
                        <div className="flex flex-col divide-y divide-border">
                          {crescimento.cancelamentosRecentes.map((r) => (
                            <div key={r.id} className="py-2">
                              <div className="flex items-center justify-between gap-3">
                                <Link
                                  href={`/admin/assinantes/${r.id}`}
                                  className="block truncate text-sm font-semibold text-text hover:text-accent"
                                >
                                  {r.nome}
                                </Link>
                                <span className="whitespace-nowrap text-xs text-text-dim">
                                  {r.canceladoEm
                                    ? dataCurta(r.canceladoEm)
                                    : "—"}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-text-dim">
                                {r.motivoCancelamento ||
                                  "Não informou o motivo."}
                              </p>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ) : null}
                  </div>
                </div>
              </>
            ),
          },
        ]}
      />

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Lembrete diário</h2>
            <p className="mt-1 text-sm text-text-dim">
              Ative pra receber um aviso todo dia sobre trials vencendo e
              pagamentos de assinatura recusados.
            </p>
          </div>
          <Link href="/configuracoes">
            <Button variant="ghost">Configurações</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
