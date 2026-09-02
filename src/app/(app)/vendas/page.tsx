import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { limitesDoMes } from "@/lib/dados";
import { brl, dataCurta } from "@/lib/format";
import { Button, Card, EmptyState, StatTile } from "@/components/ui";

export default async function VendasPage() {
  const revendedor = await exigirRevendedor();
  const { inicio, fim } = limitesDoMes();

  const vendas = await prisma.venda.findMany({
    where: { revendedorId: revendedor.id },
    include: { produto: true },
    orderBy: { data: "desc" },
  });

  const vendasNesteMes = vendas.filter((v) => v.data >= inicio && v.data < fim);
  const totalVendidoMes = vendasNesteMes.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Vendas de aparelhos</h1>
        <Link href="/vendas/nova">
          <Button>+ Registrar venda</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total vendido" value={brl(totalVendidoMes)} tone="accent" sub="neste mês" />
        <StatTile label="Produtos vendidos" value={String(vendasNesteMes.reduce((a, v) => a + v.quantidade, 0))} sub="neste mês" />
      </div>

      {vendas.length === 0 ? (
        <EmptyState>Nenhuma venda registrada ainda.</EmptyState>
      ) : (
        <Card className="p-0">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            <span>Data</span>
            <span>Produto</span>
            <span>Qtd</span>
            <span>Pagamento</span>
            <span>Total</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {vendas.map((venda) => (
              <div key={venda.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 text-sm">
                <span className="text-text-dim">{dataCurta(venda.data)}</span>
                <span className="truncate text-text">{venda.produto.modelo}</span>
                <span className="text-text-muted">{venda.quantidade}</span>
                <span className="text-text-muted">{venda.formaPagamento}</span>
                <span className="font-semibold text-accent">{brl(venda.quantidade * venda.valorUnitario)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
