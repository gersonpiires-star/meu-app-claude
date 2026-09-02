import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function GET() {
  const revendedor = await exigirRevendedor();

  const [servicos, clientes, produtos, vendas, plataformas, chavesPix] = await Promise.all([
    prisma.servico.findMany({ where: { revendedorId: revendedor.id } }),
    prisma.cliente.findMany({ where: { revendedorId: revendedor.id }, include: { renovacoes: true } }),
    prisma.produto.findMany({ where: { revendedorId: revendedor.id }, include: { movimentos: true } }),
    prisma.venda.findMany({ where: { revendedorId: revendedor.id } }),
    prisma.plataforma.findMany({ where: { revendedorId: revendedor.id }, include: { lotes: true } }),
    prisma.chavePix.findMany({ where: { revendedorId: revendedor.id } }),
  ]);

  const backup = {
    app: "gestorpro",
    versao: 1,
    gerado: new Date().toISOString(),
    dados: { servicos, clientes, produtos, vendas, plataformas, chavesPix },
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gestorpro-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
