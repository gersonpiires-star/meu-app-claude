import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl, dataCurta } from "@/lib/format";
import { PLANO_LABEL, faixaVencimento } from "@/lib/planos";
import { Badge, Button, Card, EmptyState, cx } from "@/components/ui";

const ABAS = [
  { chave: "todos", label: "Todos" },
  { chave: "ativos", label: "Ativos" },
  { chave: "atencao", label: "Precisa de atenção" },
  { chave: "cancelados", label: "Cancelados" },
] as const;

function badgeTone(faixa: ReturnType<typeof faixaVencimento>) {
  if (faixa === "VENCIDO") return "danger" as const;
  if (faixa === "ATE_5_DIAS") return "warning" as const;
  return "accent" as const;
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
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            <span>Cliente</span>
            <span>Plano</span>
            <span>Vence</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {filtrados.map((cliente) => (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.id}`}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{cliente.nome}</p>
                  <p className="truncate text-xs text-text-dim">
                    {cliente.servico?.nome ?? "—"} · {brl(cliente.valorPlano)}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-text-muted">{PLANO_LABEL[cliente.plano]}</span>
                <Badge tone={cliente.status === "CANCELADO" ? "neutral" : badgeTone(faixaVencimento(cliente.vencimento))}>
                  {dataCurta(cliente.vencimento)}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
