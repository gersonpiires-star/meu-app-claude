import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { MODELOS_COMUNICADO, mesclarModelos } from "@/lib/mensagens";
import { AvisoEmMassaClient } from "./aviso-em-massa-client";

export default async function AvisoEmMassaPage() {
  const revendedor = await exigirRevendedor();

  const [servicos, clientes, overridesModelos, avisosEnviados] = await Promise.all([
    prisma.servico.findMany({ where: { revendedorId: revendedor.id }, orderBy: { nome: "asc" } }),
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      include: { servico: true },
      orderBy: { nome: "asc" },
    }),
    prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } }),
    prisma.avisoEnvio.findMany({
      where: { cliente: { revendedorId: revendedor.id } },
      select: { clienteId: true, modelo: true },
    }),
  ]);

  const modelosMesclados = mesclarModelos(overridesModelos);
  const modelosComunicado = Object.fromEntries(
    Object.keys(MODELOS_COMUNICADO).map((chave) => [chave, modelosMesclados[chave]])
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/clientes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Clientes
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Aviso em massa por serviço</h1>
        <p className="text-xs text-text-dim">Mesmo aviso para um grupo de clientes</p>
      </div>
      <AvisoEmMassaClient
        modelosComunicado={modelosComunicado}
        avisosEnviados={avisosEnviados}
        servicos={servicos.map((s) => ({ id: s.id, nome: s.nome }))}
        clientes={clientes.map((c) => ({
          id: c.id,
          nome: c.nome,
          whatsapp: c.whatsapp,
          servicoId: c.servicoId,
          servicoNome: c.servico?.nome ?? null,
          valorPlano: c.valorPlano,
          status: c.status,
          vencimento: c.vencimento.toISOString(),
        }))}
      />
    </div>
  );
}
