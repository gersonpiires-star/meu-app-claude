import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ClienteForm } from "../../cliente-form";
import { atualizarCliente } from "../../actions";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const revendedor = await exigirRevendedor();
  const { id } = await params;

  const [cliente, servicos] = await Promise.all([
    prisma.cliente.findUnique({ where: { id, revendedorId: revendedor.id }, include: { servico: true } }),
    prisma.servico.findMany({ where: { revendedorId: revendedor.id }, select: { nome: true } }),
  ]);

  if (!cliente) notFound();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href={`/clientes/${id}`} className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ {cliente.nome}
      </Link>
      <h1 className="text-lg font-bold text-text">Editar cliente</h1>
      <Card>
        <ClienteForm
          acao={atualizarCliente.bind(null, id)}
          servicosExistentes={servicos.map((s) => s.nome)}
          valoresIniciais={{
            nome: cliente.nome,
            cpf: cliente.cpf,
            whatsapp: cliente.whatsapp,
            servico: cliente.servico?.nome,
            telas: cliente.telas,
            plano: cliente.plano,
            valorPlano: cliente.valorPlano,
            diaFixo: cliente.diaFixo,
            testeGratis: cliente.testeGratis,
            anotacao: cliente.anotacao,
          }}
          textoBotao="Salvar alterações"
        />
      </Card>
    </div>
  );
}
