import Link from "next/link";
import { exigirDono } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

export default async function HistoricoPage() {
  const revendedor = await exigirDono();
  const logs = await prisma.logAtividade.findMany({
    where: { revendedorId: revendedor.id },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/configuracoes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Configurações
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Histórico de ações</h1>
        <p className="text-xs text-text-dim">
          Ações sensíveis feitas por você e por seus funcionários — mostrando as últimas {logs.length}.
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState>Nenhuma ação registrada ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="flex flex-col divide-y divide-border">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-dim">{dataHora(log.criadoEm)}</span>
                  <Badge tone={log.autorTipo === "FUNCIONARIO" ? "warning" : "neutral"}>{log.autorNome}</Badge>
                </div>
                <p className="text-sm text-text">{log.descricao}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
