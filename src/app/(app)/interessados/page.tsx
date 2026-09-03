import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui";
import { inicioDoDiaBr } from "@/lib/format";
import { InteressadoForm } from "./interessado-form";
import { InteressadoItem } from "./interessado-item";

export default async function InteressadosPage() {
  const revendedor = await exigirRevendedor();

  const [leads, servicos] = await Promise.all([
    prisma.interessadoCliente.findMany({
      where: { revendedorId: revendedor.id, convertido: false },
      orderBy: [{ retornarEm: "asc" }, { criadoEm: "desc" }],
    }),
    prisma.servico.findMany({ where: { revendedorId: revendedor.id }, select: { nome: true } }),
  ]);

  const amanha = new Date(inicioDoDiaBr());
  amanha.setDate(amanha.getDate() + 1);
  const paraRetornarHoje = leads.filter((l) => l.retornarEm && l.retornarEm < amanha).length;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <InteressadoForm total={leads.length} paraRetornarHoje={paraRetornarHoje} servicos={servicos.map((s) => s.nome)} />

      {leads.length === 0 ? (
        <EmptyState>Nenhum interessado cadastrado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {leads.map((lead) => (
            <InteressadoItem key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
