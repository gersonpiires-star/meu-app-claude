import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { custoMedioProdutos } from "@/lib/dados";
import { diasParaVencer } from "@/lib/planos";
import { NovaVendaWizard } from "./nova-venda-wizard";
import { registrarVenda, registrarCombo } from "../actions";
import { renovarCliente } from "../../clientes/actions";

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { clienteId } = await searchParams;

  const [clientes, produtos, custos] = await Promise.all([
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      include: { servico: { select: { custoCredito: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.produto.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: { modelo: "asc" },
      select: { id: true, modelo: true },
    }),
    custoMedioProdutos(revendedor.id),
  ]);

  const produtosComCusto = produtos.map((p) => ({
    id: p.id,
    modelo: p.modelo,
    custoProximoLote: custos.get(p.id)?.proximoCusto ?? 0,
    estoqueAtual: custos.get(p.id)?.atual ?? 0,
  }));

  const clientesFormatados = clientes.map((c) => {
    const dias = diasParaVencer(c.vencimento);
    return {
      id: c.id,
      nome: c.nome,
      plano: c.plano,
      valorPlano: c.valorPlano,
      diaFixo: c.diaFixo,
      custoCredito: c.servico?.custoCredito ?? 0,
      situacao: dias < 0 ? `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} vencido` : dias === 0 ? "vence hoje" : `vence em ${dias}d`,
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/vendas" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Vendas
      </Link>
      <h1 className="text-lg font-bold text-text">Nova venda</h1>
      <p className="-mt-3 text-xs text-text-dim">Registre uma renovação ou venda de aparelho</p>

      <NovaVendaWizard
        clientes={clientesFormatados}
        produtos={produtosComCusto}
        margemPadrao={revendedor.margemPadrao}
        clienteIdInicial={clienteId ?? ""}
        acaoRenovacao={renovarCliente}
        acaoCombo={registrarCombo}
        acaoAparelho={registrarVenda}
      />
    </div>
  );
}
