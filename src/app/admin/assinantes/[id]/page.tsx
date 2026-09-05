import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso, brl0 } from "@/lib/format";
import { linkWhatsApp } from "@/lib/mensagens";
import { Badge, Card } from "@/components/ui";
import { AcoesAcesso } from "../acoes-acesso";
import { planoDosMeses } from "@/lib/planos-assinatura";

const PLANO_LABEL: Record<string, string> = { MENSAL: "Mensal", SEMESTRAL: "Semestral", ANUAL: "Anual" };

export default async function AssinanteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;

  const revendedor = await prisma.revendedor.findUnique({
    where: { id },
    include: {
      servicos: true,
      _count: { select: { clientes: true, vendas: true } },
      indicadoPor: { select: { id: true, nome: true } },
      indicados: { select: { id: true, nome: true, statusAssinatura: true } },
      pagamentos: {
        where: { tipo: "ASSINATURA", status: "APROVADO" },
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { valor: true, meses: true },
      },
    },
  });
  if (!revendedor || revendedor.papel !== "REVENDEDOR") notFound();

  const ultimoPagamento = revendedor.pagamentos[0];
  const plano = revendedor.planoAssinatura ?? (ultimoPagamento ? planoDosMeses(ultimoPagamento.meses ?? 1) : null);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link href="/admin/assinantes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Painel
      </Link>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-text">{revendedor.nome}</h1>
            <p className="text-xs text-text-dim">CPF {revendedor.cpf || "—"}</p>
            <p className="text-xs text-text-dim">{revendedor.email}</p>
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

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-dim">Conta desde</p>
            <p className="font-semibold text-text">{dataPorExtenso(revendedor.criadoEm)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-text-dim">Uso da conta</p>
            <p className="font-semibold text-text">
              {revendedor._count.clientes === 0
                ? "Criou a conta mas nunca chegou a usar o app."
                : `${revendedor._count.clientes} clientes · ${revendedor._count.vendas} vendas`}
            </p>
          </div>
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

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Acesso</h2>
        <p className="mb-3 text-sm text-text-muted">
          Status atual: <strong className="text-text">{revendedor.statusAssinatura}</strong>
          {revendedor.assinaturaVence ? ` · vence em ${dataPorExtenso(revendedor.assinaturaVence)}` : ""}
        </p>
        {plano || ultimoPagamento ? (
          <div className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface-2 p-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-dim">Plano</p>
              <p className="font-semibold text-text">{plano ? PLANO_LABEL[plano] : "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-text-dim">Valor pago</p>
              <p className="font-semibold text-text">{ultimoPagamento ? brl0(ultimoPagamento.valor) : "—"}</p>
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
  );
}
