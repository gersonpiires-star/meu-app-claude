import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { faixaVencimento } from "@/lib/planos";
import { EmptyState } from "@/components/ui";
import { FilaRenovacao } from "./fila-renovacao";

export default async function RenovarEmLotePage() {
  const revendedor = await exigirRevendedor();

  const clientes = await prisma.cliente.findMany({
    where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
    include: { servico: true },
    orderBy: { vencimento: "asc" },
  });

  const fila = clientes.filter((c) => {
    const faixa = faixaVencimento(c.vencimento);
    return faixa === "VENCIDO" || faixa === "ATE_5_DIAS";
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/clientes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Clientes
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Renovar em lote</h1>
        <p className="text-xs text-text-dim">Cada um renova no próprio plano</p>
      </div>

      {fila.length === 0 ? (
        <EmptyState>Nenhum cliente vencido ou vencendo agora.</EmptyState>
      ) : (
        <FilaRenovacao
          clientes={fila.map((c) => ({
            id: c.id,
            nome: c.nome,
            servicoNome: c.servico?.nome ?? null,
            valorPlano: c.valorPlano,
            vencimento: c.vencimento.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
