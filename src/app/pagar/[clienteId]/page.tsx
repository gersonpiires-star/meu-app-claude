import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { brl, dataPorExtenso } from "@/lib/format";
import { PLANO_LABEL, faixaVencimento } from "@/lib/planos";
import { Badge, Card } from "@/components/ui";
import { PagarBotao } from "./pagar-botao";

export default async function PagarPage({ params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { servico: true, revendedor: { select: { nome: true, mpAccessToken: true } } },
  });
  if (!cliente) notFound();

  const cancelado = cliente.status === "CANCELADO";
  const faixa = faixaVencimento(cliente.vencimento);

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-bg px-4 py-10 text-text">
      <Card className="w-full max-w-sm">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-text-dim">
          {cliente.revendedor.nome}
        </p>
        <h1 className="mt-1 text-center text-lg font-bold text-text">Renovação — {cliente.nome}</h1>

        <div className="mt-5 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-text-dim">Serviço</span>
            <span className="font-semibold text-text">{cliente.servico?.nome ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-dim">Plano</span>
            <span className="font-semibold text-text">{PLANO_LABEL[cliente.plano]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-dim">Vencimento</span>
            <span className="font-semibold text-text">{dataPorExtenso(cliente.vencimento)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-text-dim">Valor</span>
            <span className="text-lg font-bold text-accent">{brl(cliente.valorPlano)}</span>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          {cancelado ? (
            <Badge tone="neutral">Cliente cancelado</Badge>
          ) : faixa === "VENCIDO" ? (
            <Badge tone="danger">Vencido</Badge>
          ) : faixa === "ATE_5_DIAS" ? (
            <Badge tone="warning">Vencendo</Badge>
          ) : (
            <Badge tone="success">Em dia</Badge>
          )}
        </div>

        <div className="mt-5">
          {cancelado ? (
            <p className="text-center text-sm text-text-dim">Fale com quem te atende para reativar.</p>
          ) : !cliente.revendedor.mpAccessToken ? (
            <p className="text-center text-sm text-text-dim">
              Pagamento online ainda não está disponível — fale com quem te atende.
            </p>
          ) : (
            <PagarBotao clienteId={clienteId} />
          )}
        </div>
      </Card>
    </main>
  );
}
