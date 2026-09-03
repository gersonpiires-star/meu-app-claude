import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl0, dataCurta, fmtTelefone, iniciais } from "@/lib/format";
import { PLANO_LABEL, diasParaVencer, faixaVencimento } from "@/lib/planos";
import { Badge, Button, Card, EmptyState, cx } from "@/components/ui";
import { RenovarBotao } from "./renovar-em-lote/renovar-botao";

const ABAS = [
  { chave: "todos", label: "Todos" },
  { chave: "ativos", label: "Ativos" },
  { chave: "atencao", label: "Precisa de atenção" },
  { chave: "cancelados", label: "Cancelados" },
] as const;

type Tom = "neutral" | "danger" | "warning" | "success";

const AVATAR_TOM: Record<Tom, string> = {
  neutral: "bg-surface-2 text-text-muted",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  success: "bg-accent-soft text-accent",
};

function estadoCliente(status: string, vencimento: Date): { tom: Tom; label: string } {
  if (status === "CANCELADO") return { tom: "neutral", label: "Cancelado" };
  const faixa = faixaVencimento(vencimento);
  if (faixa === "VENCIDO") return { tom: "danger", label: "Vencido" };
  if (faixa === "ATE_5_DIAS") return { tom: "warning", label: "Vencendo" };
  return { tom: "success", label: "Em dia" };
}

function diasTexto(vencimento: Date): string {
  const dias = diasParaVencer(vencimento);
  return dias < 0 ? `${Math.abs(dias)}d atrás` : `em ${dias}d`;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { aba = "ativos" } = await searchParams;

  const clientes = await prisma.cliente.findMany({
    where: { revendedorId: revendedor.id },
    include: { servico: true },
    orderBy: { vencimento: "asc" },
  });

  const filtrados = clientes.filter((c) => {
    if (aba === "cancelados") return c.status === "CANCELADO";
    if (c.status === "CANCELADO") return false;
    if (aba === "atencao") {
      const faixa = faixaVencimento(c.vencimento);
      return faixa === "VENCIDO" || faixa === "ATE_5_DIAS";
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Clientes</h1>
        <div className="flex gap-2">
          <Link href="/clientes/cobrar-em-lote">
            <Button variant="ghost">Cobrar em lote</Button>
          </Link>
          <Link href="/clientes/renovar-em-lote">
            <Button variant="ghost">Renovar em lote</Button>
          </Link>
          <Link href="/clientes/aviso-em-massa">
            <Button variant="ghost">Aviso em massa</Button>
          </Link>
          <Link href="/clientes/novo">
            <Button>+ Novo cliente</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border-strong p-1 text-sm">
        {ABAS.map((item) => (
          <Link
            key={item.chave}
            href={`/clientes?aba=${item.chave}`}
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
        <EmptyState>Nenhum cliente nesta lista ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          {/* Desktop: tabela no padrão do app original (Cliente / WhatsApp / Plano · App / Vencimento / Valor / Status / Cobrar) */}
          <div className="hidden md:grid md:grid-cols-[1.9fr_1.2fr_1.3fr_1.1fr_0.8fr_1fr_220px] md:gap-3 md:border-b md:border-border md:px-4 md:py-2 md:text-[11px] md:font-semibold md:uppercase md:tracking-wider md:text-text-dim">
            <span>Cliente</span>
            <span>WhatsApp</span>
            <span>Plano · App</span>
            <span>Vencimento</span>
            <span>Valor</span>
            <span>Status</span>
            <span />
          </div>
          <div className="flex flex-col divide-y divide-border">
            {filtrados.map((cliente) => {
              const estado = estadoCliente(cliente.status, cliente.vencimento);

              return (
                <div key={cliente.id} className="md:grid md:grid-cols-[1.9fr_1.2fr_1.3fr_1.1fr_0.8fr_1fr_220px] md:items-center md:gap-3 md:px-4 md:py-3 md:hover:bg-surface-2">
                  {/* Desktop */}
                  <Link href={`/clientes/${cliente.id}`} className="hidden min-w-0 items-center gap-3 md:flex">
                    <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold", AVATAR_TOM[estado.tom])}>
                      {iniciais(cliente.nome)}
                    </span>
                    <span className="truncate text-sm font-semibold text-text">{cliente.nome}</span>
                  </Link>
                  <span className="hidden truncate text-xs text-text-muted md:block">{fmtTelefone(cliente.whatsapp)}</span>
                  <span className="hidden truncate text-xs text-text-muted md:block">
                    {PLANO_LABEL[cliente.plano]} · {cliente.servico?.nome ?? "—"}
                  </span>
                  <div className="hidden md:flex md:flex-col">
                    <span className="text-sm font-semibold text-text">{dataCurta(cliente.vencimento)}</span>
                    <span className="text-[11px] text-text-dim">{diasTexto(cliente.vencimento)}</span>
                  </div>
                  <span className="hidden text-sm font-semibold text-text md:block">{brl0(cliente.valorPlano)}</span>
                  <span className="hidden md:block">
                    <Badge tone={estado.tom}>{estado.label}</Badge>
                  </span>
                  <span className="hidden md:flex md:gap-1.5">
                    {cliente.whatsapp && cliente.status !== "CANCELADO" ? (
                      <Link href={`/clientes/${cliente.id}/cobranca`} className="flex-1">
                        <Button variant="ghost" className="w-full">
                          Cobrar
                        </Button>
                      </Link>
                    ) : null}
                    {cliente.status !== "CANCELADO" ? <RenovarBotao clienteId={cliente.id} className="flex-1" /> : null}
                  </span>

                  {/* Mobile */}
                  <div className="flex flex-col gap-2 px-4 py-3 md:hidden">
                    <Link href={`/clientes/${cliente.id}`} className="flex items-center gap-3">
                      <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold", AVATAR_TOM[estado.tom])}>
                        {iniciais(cliente.nome)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">{cliente.nome}</p>
                        <p className="truncate text-xs text-text-dim">
                          {PLANO_LABEL[cliente.plano]} · {cliente.servico?.nome ?? "—"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold text-text">{brl0(cliente.valorPlano)}</span>
                        <Badge tone={estado.tom}>{estado.label}</Badge>
                      </div>
                    </Link>
                    {cliente.status !== "CANCELADO" ? (
                      <div className="flex gap-2 pl-12">
                        {cliente.whatsapp ? (
                          <Link href={`/clientes/${cliente.id}/cobranca`} className="flex-1">
                            <Button variant="ghost" className="w-full">
                              Cobrar
                            </Button>
                          </Link>
                        ) : null}
                        <RenovarBotao clienteId={cliente.id} className="flex-1" />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
