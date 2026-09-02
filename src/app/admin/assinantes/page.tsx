import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataCurta } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

function statusBadge(revendedor: { statusAssinatura: string; trialFim: Date; assinaturaVence: Date | null }) {
  const agora = new Date();
  if (revendedor.statusAssinatura === "ATIVO") {
    return <Badge tone="accent">Ativo</Badge>;
  }
  if (revendedor.statusAssinatura === "TRIAL") {
    const dias = Math.max(0, Math.ceil((revendedor.trialFim.getTime() - agora.getTime()) / 86400000));
    return <Badge tone={dias > 0 ? "neutral" : "danger"}>{dias > 0 ? `+${dias}d trial` : "Trial expirado"}</Badge>;
  }
  return <Badge tone="danger">Pausado</Badge>;
}

export default async function AssinantesPage() {
  await exigirAdmin();

  const revendedores = await prisma.revendedor.findMany({
    where: { papel: "REVENDEDOR" },
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { clientes: true } } },
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Assinantes</h1>

      {revendedores.length === 0 ? (
        <EmptyState>Nenhuma conta ainda. Elas aparecem aqui assim que alguém se cadastrar.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="flex flex-col divide-y divide-border">
            {revendedores.map((a) => (
              <Link
                key={a.id}
                href={`/admin/assinantes/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{a.nome}</p>
                  <p className="truncate text-xs text-text-dim">
                    CPF {a.cpf || "—"} · desde {dataCurta(a.criadoEm)} ·{" "}
                    {a._count.clientes === 0 ? "criou a conta mas nunca chegou a usar o app" : `${a._count.clientes} clientes`}
                  </p>
                </div>
                {statusBadge(a)}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
