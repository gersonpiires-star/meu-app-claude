import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { InteressadoForm } from "./interessado-form";

export default async function InteressadosPage() {
  const revendedor = await exigirRevendedor();
  const servicos = await prisma.servico.findMany({
    where: { revendedorId: revendedor.id },
    select: { nome: true },
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/clientes?aba=interessados" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Interessados
      </Link>
      <h1 className="text-lg font-bold text-text">Novo interessado</h1>
      <InteressadoForm servicos={servicos.map((s) => s.nome)} />
    </div>
  );
}
