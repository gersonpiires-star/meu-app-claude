import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl0, dataCurta, diaCivilBr, fmtTelefone, iniciais } from "@/lib/format";
import { linkWhatsApp } from "@/lib/mensagens";
import { Badge, Card, EmptyState, Input, cx } from "@/components/ui";
import { planoDosMeses } from "@/lib/planos-assinatura";

const PLANO_LABEL: Record<string, string> = { MENSAL: "Mensal", SEMESTRAL: "Semestral", ANUAL: "Anual" };

const ABAS = [
  { chave: "assinantes", label: "Assinantes" },
  { chave: "trial", label: "Em trial" },
  { chave: "pausados", label: "Pausados" },
  { chave: "cancelados", label: "Cancelados" },
  { chave: "todos", label: "Todos" },
] as const;

type Tom = "neutral" | "danger" | "warning" | "success" | "accent";

const AVATAR_TOM: Record<Tom, string> = {
  neutral: "bg-surface-2 text-text-muted",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  success: "bg-accent-soft text-accent",
  accent: "bg-accent-soft text-accent",
};

function statusInfo(revendedor: { statusAssinatura: string; trialFim: Date; assinaturaVence: Date | null }): {
  tom: Tom;
  label: string;
} {
  const agora = new Date();
  if (revendedor.statusAssinatura === "ATIVO") {
    const venceu = revendedor.assinaturaVence && revendedor.assinaturaVence <= agora;
    return venceu ? { tom: "danger", label: "Plano vencido" } : { tom: "success", label: "Ativo" };
  }
  if (revendedor.statusAssinatura === "CANCELADO") return { tom: "neutral", label: "Cancelado" };
  if (revendedor.statusAssinatura === "PAUSADO") return { tom: "warning", label: "Pausado" };
  const dias = Math.max(0, Math.ceil((revendedor.trialFim.getTime() - agora.getTime()) / 86400000));
  return dias > 0 ? { tom: "neutral", label: `+${dias}d trial` } : { tom: "danger", label: "Trial expirado" };
}

function diaDoTrial(criadoEm: Date): number {
  const c = diaCivilBr(criadoEm);
  const h = diaCivilBr(new Date());
  return Math.round((new Date(h.ano, h.mes, h.dia).getTime() - new Date(c.ano, c.mes, c.dia).getTime()) / 86400000) + 1;
}

function linkNutricaoWhatsapp(whatsapp: string, nome: string, temClientes: boolean) {
  const primeiroNome = nome.split(" ")[0];
  const texto = temClientes
    ? `Oi ${primeiroNome}! Vi que você já começou a usar o GestorPro. Ficou alguma dúvida ou posso ajudar em algo?`
    : `Oi ${primeiroNome}! Notei que você criou sua conta no GestorPro mas ainda não cadastrou nenhum cliente. Posso te ajudar a começar?`;
  return linkWhatsApp(whatsapp, texto);
}

export default async function AssinantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; aba?: string }>;
}) {
  await exigirAdmin();
  const { q, aba = "assinantes" } = await searchParams;
  const busca = q?.trim();

  const revendedores = await prisma.revendedor.findMany({
    where: {
      papel: "REVENDEDOR",
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { email: { contains: busca, mode: "insensitive" } },
              { cpf: { contains: busca } },
            ],
          }
        : {}),
    },
    orderBy: { criadoEm: "desc" },
    include: {
      _count: { select: { clientes: true } },
      pagamentos: {
        where: { tipo: "ASSINATURA", status: "APROVADO" },
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { valor: true, meses: true },
      },
    },
  });

  const filtrados = revendedores.filter((r) => {
    if (aba === "assinantes") return r.statusAssinatura === "ATIVO";
    if (aba === "trial") return r.statusAssinatura === "TRIAL";
    if (aba === "pausados") return r.statusAssinatura === "PAUSADO";
    if (aba === "cancelados") return r.statusAssinatura === "CANCELADO";
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Assinantes</h1>

      <form action="/admin/assinantes" method="get">
        <input type="hidden" name="aba" value={aba} />
        <Input name="q" defaultValue={busca ?? ""} placeholder="Buscar por nome, e-mail ou CPF" />
      </form>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border-strong p-1 text-sm">
        {ABAS.map((item) => (
          <Link
            key={item.chave}
            href={`/admin/assinantes?aba=${item.chave}${busca ? `&q=${encodeURIComponent(busca)}` : ""}`}
            className={cx(
              "whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold",
              aba === item.chave ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState>
          {busca ? "Nenhum assinante encontrado com essa busca." : "Ninguém nesta lista ainda."}
        </EmptyState>
      ) : (
        <Card className="p-0">
          <div className="hidden md:grid md:grid-cols-[1.9fr_1.2fr_0.9fr_1.1fr_0.9fr_1fr] md:gap-3 md:border-b md:border-border md:px-4 md:py-2 md:text-[11px] md:font-semibold md:uppercase md:tracking-wider md:text-text-dim">
            <span>Cliente</span>
            <span>WhatsApp</span>
            <span>Plano</span>
            <span>Vencimento</span>
            <span>Valor</span>
            <span>Status</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {filtrados.map((a) => {
              const estado = statusInfo(a);
              const ultimoPagamento = a.pagamentos[0];
              // Plano/valor vêm do último pagamento aprovado, independente do status
              // atual — pausar ou cancelar não apaga o que o assinante já pagou, então
              // a lista continua mostrando o plano/valor dele em vez de "—".
              const plano =
                a.planoAssinatura ??
                (ultimoPagamento ? planoDosMeses(ultimoPagamento.meses ?? 1) : a.statusAssinatura === "TRIAL" ? "TRIAL" : null);
              const vencimento = a.statusAssinatura === "TRIAL" ? a.trialFim : a.assinaturaVence;
              const valor = ultimoPagamento ? brl0(ultimoPagamento.valor) : "—";
              const chamarLink =
                a.statusAssinatura === "TRIAL" && a.whatsapp
                  ? linkNutricaoWhatsapp(a.whatsapp, a.nome, a._count.clientes > 0)
                  : a.whatsapp
                    ? linkWhatsApp(a.whatsapp)
                    : null;

              return (
                <div
                  key={a.id}
                  className="md:grid md:grid-cols-[1.9fr_1.2fr_0.9fr_1.1fr_0.9fr_1fr] md:items-center md:gap-3 md:px-4 md:py-3 md:hover:bg-surface-2"
                >
                  {/* Desktop */}
                  <Link href={`/admin/assinantes/${a.id}`} className="hidden min-w-0 items-center gap-3 md:flex">
                    <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", AVATAR_TOM[estado.tom])}>
                      {iniciais(a.nome)}
                    </span>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-text">{a.nome}</span>
                      {a.statusAssinatura === "TRIAL" ? (
                        <span className="block text-[11px] text-text-dim">dia {diaDoTrial(a.criadoEm)} do trial</span>
                      ) : null}
                    </div>
                  </Link>
                  <span className="hidden truncate text-xs text-text-muted md:block">{a.whatsapp ? fmtTelefone(a.whatsapp) : "—"}</span>
                  <span className="hidden truncate text-xs text-text-muted md:block">
                    {plano === "TRIAL" ? "Trial" : plano ? PLANO_LABEL[plano] : "—"}
                  </span>
                  <span className="hidden truncate text-xs text-text-muted md:block">{vencimento ? dataCurta(vencimento) : "—"}</span>
                  <span className="hidden text-sm font-semibold text-text md:block">{valor}</span>
                  <div className="hidden md:flex md:items-center md:justify-between md:gap-2">
                    <Badge tone={estado.tom}>{estado.label}</Badge>
                    {chamarLink ? (
                      <a href={chamarLink} target="_blank" rel="noreferrer">
                        <Badge tone="accent">Chamar</Badge>
                      </a>
                    ) : null}
                  </div>

                  {/* Mobile */}
                  <Link href={`/admin/assinantes/${a.id}`} className="flex items-center gap-3 px-4 py-3 md:hidden">
                    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold", AVATAR_TOM[estado.tom])}>
                      {iniciais(a.nome)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">{a.nome}</p>
                      <p className="truncate text-xs text-text-dim">
                        {plano === "TRIAL" ? "Trial" : plano ? PLANO_LABEL[plano] : "—"}
                        {vencimento ? ` · vence ${dataCurta(vencimento)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold text-text">{valor}</span>
                      <Badge tone={estado.tom}>{estado.label}</Badge>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
