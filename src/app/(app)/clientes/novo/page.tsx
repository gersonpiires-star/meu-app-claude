import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { ClienteForm } from "../cliente-form";
import { criarCliente } from "../actions";

export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; whatsapp?: string; servico?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const [servicos, clientes, params] = await Promise.all([
    prisma.servico.findMany({
      where: { revendedorId: revendedor.id },
      select: { nome: true },
    }),
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    searchParams,
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/clientes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Clientes
      </Link>
      <h1 className="text-lg font-bold text-text">Cadastrar cliente</h1>
      <Card>
        <ClienteForm
          acao={criarCliente}
          servicosExistentes={servicos.map((s) => s.nome)}
          clientesParaIndicacao={clientes}
          valoresIniciais={{ nome: params.nome, whatsapp: params.whatsapp, servico: params.servico }}
        />
      </Card>
    </div>
  );
}
