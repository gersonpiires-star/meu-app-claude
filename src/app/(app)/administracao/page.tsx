import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl0 } from "@/lib/format";
import { limitesDoMes } from "@/lib/dados";
import { Badge, Card, StatTile } from "@/components/ui";
import { EnviarCreditosForm } from "./enviar-creditos-form";
import { PublicarAvisoRapidoForm } from "./publicar-aviso-rapido-form";

const PLANO_LABEL: Record<string, string> = { MENSAL: "Mensal", SEMESTRAL: "Semestral", ANUAL: "Anual" };

const IconContas = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const IconAtivo = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTeste = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M10 5v5l3.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const IconMoeda = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.5v7M7.8 8.3c0-1 .9-1.8 2.2-1.8s2.2.6 2.2 1.5c0 2-4.4 1-4.4 3 0 .9 1 1.5 2.2 1.5s2.2-.7 2.2-1.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

function statusConta(r: { statusAssinatura: string; pausadoEm: Date | null; trialFim: Date }): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (r.pausadoEm || r.statusAssinatura === "PAUSADO") return { label: "Bloqueada", tone: "danger" };
  if (r.statusAssinatura === "CANCELADO") return { label: "Cancelada", tone: "neutral" };
  if (r.statusAssinatura === "TRIAL") {
    const dias = Math.max(0, Math.ceil((r.trialFim.getTime() - Date.now()) / 86400000));
    return { label: `Teste · ${dias}d`, tone: "warning" };
  }
  return { label: "Ativa", tone: "success" };
}

export default async function AdministracaoPage() {
  await exigirAdmin();
  const { inicio, fim } = limitesDoMes();

  const [contas, creditosMes] = await Promise.all([
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR" },
      orderBy: { criadoEm: "desc" },
      include: { _count: { select: { clientes: true } } },
    }),
    prisma.creditoConta.aggregate({
      where: { criadoEm: { gte: inicio, lt: fim } },
      _sum: { quantidade: true },
    }),
  ]);

  const ativas = contas.filter((c) => c.statusAssinatura === "ATIVO" && !c.pausadoEm).length;
  const emTeste = contas.filter((c) => c.statusAssinatura === "TRIAL").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Administração</h1>
          <p className="text-xs text-text-dim">Contas que usam o GestorPro, planos e créditos</p>
        </div>
        <Link href="/admin" className="text-xs font-semibold text-accent hover:underline">
          Painel completo (MRR, churn, trials) →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Contas" value={String(contas.length)} sub="revendedores" icon={IconContas} />
        <StatTile label="Ativas" value={String(ativas)} tone="accent" icon={IconAtivo} />
        <StatTile label="Em teste" value={String(emTeste)} tone="warning" icon={IconTeste} />
        <StatTile label="Créditos enviados" value={brl0(creditosMes._sum.quantidade ?? 0)} sub="neste mês" tone="money" icon={IconMoeda} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="text-sm font-bold text-text">Contas</h2>
          </div>
          <div className="flex min-w-[640px] items-center gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            <span className="min-w-0 flex-1">Conta</span>
            <span className="w-24 shrink-0">Plano</span>
            <span className="w-20 shrink-0 text-right">Clientes</span>
            <span className="w-24 shrink-0 text-right">Créditos</span>
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
                    <p className="truncate font-semibold text-text">{conta.nomeNegocio || conta.nome}</p>
                    <p className="truncate text-xs text-text-dim">{conta.email}</p>
                  </div>
                  <span className="w-24 shrink-0 text-text-muted">
                    {conta.planoAssinatura ? PLANO_LABEL[conta.planoAssinatura] : "Teste"}
                  </span>
                  <span className="w-20 shrink-0 text-right text-text-muted">{conta._count.clientes}</span>
                  <span className="w-24 shrink-0 text-right font-semibold text-money">{brl0(conta.saldoCreditos)}</span>
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
            <h2 className="mb-3 text-sm font-bold text-text">Enviar créditos</h2>
            <EnviarCreditosForm contas={contas.map((c) => ({ id: c.id, nome: c.nomeNegocio || c.nome }))} />
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-bold text-text">Avisos do sistema</h2>
            <p className="mb-3 text-xs text-text-dim">Mensagem para todas as contas ativas.</p>
            <PublicarAvisoRapidoForm />
            <Link href="/admin/comunicados" className="mt-3 block text-xs font-semibold text-accent hover:underline">
              Ver todos os comunicados →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
