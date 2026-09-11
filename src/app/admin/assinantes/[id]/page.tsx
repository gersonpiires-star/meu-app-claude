import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso, dataCurta, brl0, fmtTelefone } from "@/lib/format";
import { linkWhatsApp } from "@/lib/mensagens";
import { Badge, Card } from "@/components/ui";
import { AcoesAcesso } from "../acoes-acesso";
import { planoDosMeses } from "@/lib/planos-assinatura";
import type { StatusAssinatura } from "@/generated/prisma/enums";

const PLANO_LABEL: Record<string, string> = { MENSAL: "Mensal", SEMESTRAL: "Semestral", ANUAL: "Anual" };

const STATUS_PAGAMENTO_LABEL: Record<string, string> = {
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  PENDENTE: "Pendente",
  CANCELADO: "Cancelado",
};

function statusInfo(statusAssinatura: StatusAssinatura, assinaturaVence: Date | null): { tom: "success" | "danger" | "warning" | "neutral"; label: string } {
  if (statusAssinatura === "ATIVO") {
    const venceu = assinaturaVence && assinaturaVence <= new Date();
    return venceu ? { tom: "danger", label: "Plano vencido" } : { tom: "success", label: "Ativo" };
  }
  if (statusAssinatura === "CANCELADO") return { tom: "neutral", label: "Cancelado" };
  if (statusAssinatura === "PAUSADO") return { tom: "warning", label: "Pausado" };
  return { tom: "neutral", label: "Trial" };
}

// Mesmo sinal usado em "Assinantes esfriando" (dados-admin.ts) — dias desde a
// última ação registrada no app, caindo pra data de conversão em pagante (não
// o cadastro/trial) quando nunca teve nenhuma atividade.
function formatarUltimaAtividade(dias: number | null): string {
  if (dias === null) return "Nunca usou o app";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `Há ${dias} dias`;
}

export default async function AssinanteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;

  const revendedor = await prisma.revendedor.findUnique({
    where: { id },
    include: {
      servicos: true,
      _count: { select: { clientes: true, vendas: true, funcionarios: true, chavesPix: true } },
      indicadoPor: { select: { id: true, nome: true } },
      indicados: { select: { id: true, nome: true, statusAssinatura: true } },
      pagamentos: {
        where: { tipo: "ASSINATURA" },
        orderBy: { criadoEm: "desc" },
        take: 5,
        select: { id: true, valor: true, meses: true, status: true, criadoEm: true },
      },
    },
  });
  if (!revendedor || revendedor.papel !== "REVENDEDOR") notFound();

  const [ultimaAtividade, totalPagoAgg] = await Promise.all([
    prisma.logAtividade.aggregate({ where: { revendedorId: id }, _max: { criadoEm: true } }),
    prisma.pagamento.aggregate({
      where: { revendedorId: id, tipo: "ASSINATURA", status: "APROVADO" },
      _sum: { valor: true },
    }),
  ]);

  const diasSemAtividade = ultimaAtividade._max.criadoEm
    ? Math.floor((new Date().getTime() - ultimaAtividade._max.criadoEm.getTime()) / 86400000)
    : null;
  const totalPago = totalPagoAgg._sum.valor ?? 0;

  const ultimoPagamentoAprovado = revendedor.pagamentos.find((p) => p.status === "APROVADO");
  const plano = revendedor.planoAssinatura ?? (ultimoPagamentoAprovado ? planoDosMeses(ultimoPagamentoAprovado.meses ?? 1) : null);
  const status = statusInfo(revendedor.statusAssinatura, revendedor.assinaturaVence);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 lg:max-w-4xl">
      <Link href="/admin/assinantes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Painel
      </Link>

      {/* Identidade — largura cheia nos dois layouts, é o cabeçalho da página */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-text">{revendedor.nome}</h1>
              <Badge tone={status.tom}>{status.label}</Badge>
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-text-dim lg:flex-row lg:flex-wrap lg:gap-x-4">
              <span>CPF {revendedor.cpf || "—"}</span>
              <span>{revendedor.email}</span>
              <span>{fmtTelefone(revendedor.whatsapp)}</span>
            </div>
          </div>
          {revendedor.whatsapp ? (
            <a
              href={linkWhatsApp(revendedor.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap rounded-xl bg-whatsapp px-3 py-2 text-xs font-semibold text-bg-deep"
            >
              Chamar
            </a>
          ) : null}
        </div>
      </Card>

      {/* Desktop: painel de ações fica fixo numa coluna lateral enquanto o
          conteúdo informativo (mais longo) rola na coluna principal. No
          celular tudo empilha na ordem natural de leitura. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-5">
        <div className="flex flex-col gap-5 lg:order-1 lg:col-span-2">
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Conta</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-text-dim">Conta desde</p>
                <p className="font-semibold text-text">{dataPorExtenso(revendedor.criadoEm)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-text-dim">Última atividade</p>
                <p className="font-semibold text-text">{formatarUltimaAtividade(diasSemAtividade)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-text-dim">Clientes · Vendas</p>
                <p className="font-semibold text-text">
                  {revendedor._count.clientes} · {revendedor._count.vendas}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-text-dim">Funcionários · Chaves Pix</p>
                <p className="font-semibold text-text">
                  {revendedor._count.funcionarios} · {revendedor._count.chavesPix}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone={revendedor.mpAccessToken ? "accent" : "neutral"}>
                {revendedor.mpAccessToken ? "Mercado Pago configurado" : "Sem Mercado Pago"}
              </Badge>
              {revendedor.unitvUsuario ? <Badge tone="warning">UniTV conectado</Badge> : null}
              {revendedor.metaReceitaMensal ? (
                <Badge tone="neutral">Meta do mês {brl0(revendedor.metaReceitaMensal)}</Badge>
              ) : null}
              {revendedor.diasParaCancelarAutomatico ? (
                <Badge tone="neutral">Cancela sozinho em {revendedor.diasParaCancelarAutomatico}d</Badge>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-text-dim">Serviços que ele revende</p>
              {revendedor.servicos.length === 0 ? (
                <p className="text-sm text-text-dim">Nenhum serviço cadastrado ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {revendedor.servicos.map((s) => (
                    <Badge key={s.id} tone="neutral">
                      {s.nome}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {revendedor.pagamentos.length > 0 ? (
            <Card>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-text">Histórico de pagamentos</h2>
                <span className="text-xs text-text-dim">Total pago: {brl0(totalPago)}</span>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {revendedor.pagamentos.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-text-dim">{dataCurta(p.criadoEm)}</span>
                    <span className="font-semibold text-text">{brl0(p.valor)}</span>
                    <Badge tone={p.status === "APROVADO" ? "accent" : p.status === "RECUSADO" ? "danger" : "neutral"}>
                      {STATUS_PAGAMENTO_LABEL[p.status] ?? p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {revendedor.statusAssinatura === "CANCELADO" ? (
            <Card className="border-warning-border bg-warning-bg/30">
              <h2 className="mb-1 text-sm font-bold text-warning">Cancelou a assinatura</h2>
              <p className="text-xs text-text-dim">
                {revendedor.canceladoEm ? `Em ${dataPorExtenso(revendedor.canceladoEm)}` : ""}
              </p>
              <p className="mt-2 text-sm text-text-muted">
                {revendedor.motivoCancelamento || "Não informou o motivo."}
              </p>
            </Card>
          ) : null}

          {revendedor.indicadoPor || revendedor.indicados.length > 0 ? (
            <Card>
              {revendedor.indicadoPor ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-text-dim">Indicado por</span>
                  <Link href={`/admin/assinantes/${revendedor.indicadoPor.id}`} className="text-sm font-semibold text-accent hover:underline">
                    {revendedor.indicadoPor.nome}
                  </Link>
                </div>
              ) : null}
              {revendedor.indicados.length > 0 ? (
                <div className={revendedor.indicadoPor ? "mt-3 border-t border-border pt-3" : ""}>
                  <p className="mb-2 text-xs text-text-dim">
                    Indicou {revendedor.indicados.length} pessoa{revendedor.indicados.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-col divide-y divide-border">
                    {revendedor.indicados.map((i) => (
                      <Link
                        key={i.id}
                        href={`/admin/assinantes/${i.id}`}
                        className="flex items-center justify-between gap-3 py-1.5 text-sm hover:text-accent"
                      >
                        <span className="truncate text-text-muted">{i.nome}</span>
                        <Badge tone={i.statusAssinatura === "ATIVO" ? "accent" : "neutral"}>{i.statusAssinatura}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>

        <div className="lg:order-2 lg:col-span-1 lg:sticky lg:top-6">
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Acesso</h2>
            <p className="mb-3 text-sm text-text-muted">
              Status atual: <strong className="text-text">{revendedor.statusAssinatura}</strong>
              {revendedor.statusAssinatura === "TRIAL"
                ? ` · trial até ${dataPorExtenso(revendedor.trialFim)}`
                : revendedor.assinaturaVence
                  ? ` · vence em ${dataPorExtenso(revendedor.assinaturaVence)}`
                  : ""}
            </p>
            {plano || ultimoPagamentoAprovado ? (
              <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-dim">Plano</p>
                  <p className="font-semibold text-text">{plano ? PLANO_LABEL[plano] : "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-text-dim">Último pago</p>
                  <p className="font-semibold text-text">{ultimoPagamentoAprovado ? brl0(ultimoPagamentoAprovado.valor) : "—"}</p>
                </div>
              </div>
            ) : null}
            {revendedor.statusAssinatura === "PAUSADO" ? (
              <p className="mb-3 rounded-xl border border-warning-border bg-warning-bg/30 px-3 py-2 text-sm text-warning">
                Motivo da pausa: {revendedor.motivoPausa || "Não informado."}
              </p>
            ) : null}
            <AcoesAcesso revendedorId={revendedor.id} statusAssinatura={revendedor.statusAssinatura} />
          </Card>
        </div>
      </div>
    </div>
  );
}
