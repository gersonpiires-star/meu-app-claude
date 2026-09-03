import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { custoMedioProdutos } from "@/lib/dados";
import { Card } from "@/components/ui";
import { VendaForm } from "../venda-form";
import { registrarVenda } from "../actions";

export default async function NovaVendaPage() {
  const revendedor = await exigirRevendedor();
  const [produtos, clientes, custos] = await Promise.all([
    prisma.produto.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: { modelo: "asc" },
      select: { id: true, modelo: true },
    }),
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    custoMedioProdutos(revendedor.id),
  ]);

  const produtosComCusto = produtos.map((p) => ({ ...p, custoMedio: custos.get(p.id)?.custoMedio ?? 0 }));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/vendas" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Vendas
      </Link>
      <h1 className="text-lg font-bold text-text">Registrar venda</h1>
      <Card>
        <VendaForm acao={registrarVenda} produtos={produtosComCusto} clientes={clientes} margemPadrao={revendedor.margemPadrao} />
      </Card>
    </div>
  );
}
