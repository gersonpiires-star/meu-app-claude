import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { PrecificacaoTabs } from "./tabs";

export default async function PrecificacaoPage() {
  const revendedor = await exigirRevendedor();

  const [servicos, plataformas] = await Promise.all([
    prisma.servico.findMany({
      where: { revendedorId: revendedor.id },
      include: { _count: { select: { clientes: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.plataforma.findMany({ where: { revendedorId: revendedor.id }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Precificação</h1>
      <PrecificacaoTabs
        servicos={servicos.map((s) => ({
          id: s.id,
          nome: s.nome,
          plataformaId: s.plataformaId,
          custoCredito: s.custoCredito,
          cobrancaTelaExtra: s.cobrancaTelaExtra,
          totalClientes: s._count.clientes,
        }))}
        plataformas={plataformas.map((p) => ({ id: p.id, nome: p.nome }))}
        margemPadrao={revendedor.margemPadrao}
      />
    </div>
  );
}
