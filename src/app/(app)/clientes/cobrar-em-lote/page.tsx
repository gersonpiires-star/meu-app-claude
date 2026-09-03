import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { faixaVencimento, PLANO_LABEL } from "@/lib/planos";
import { mesclarModelos, preencherModelo } from "@/lib/mensagens";
import { brl, dataCurta } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { FilaCobranca } from "./fila-cobranca";

export default async function CobrarEmLotePage() {
  const revendedor = await exigirRevendedor();

  const [clientes, overridesModelos] = await Promise.all([
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      include: { servico: true },
      orderBy: { vencimento: "asc" },
    }),
    prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } }),
  ]);
  const modelos = mesclarModelos(overridesModelos);

  const fila = clientes.filter((c) => {
    const faixa = faixaVencimento(c.vencimento);
    return (faixa === "VENCIDO" || faixa === "ATE_5_DIAS") && c.whatsapp;
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/clientes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Clientes
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Cobrar em lote</h1>
        <p className="text-xs text-text-dim">Manda a mensagem de cobrança um por um — a renovação continua manual</p>
      </div>

      {fila.length === 0 ? (
        <EmptyState>Nenhum cliente vencido ou vencendo agora (com WhatsApp cadastrado).</EmptyState>
      ) : (
        <FilaCobranca
          clientes={fila.map((c) => {
            const vencido = faixaVencimento(c.vencimento) === "VENCIDO";
            const mensagem = preencherModelo(modelos[vencido ? "Vencido" : "Lembrete"] ?? "", {
              nome: c.nome,
              app: c.servico?.nome ?? "",
              plano: PLANO_LABEL[c.plano],
              vencimento: dataCurta(c.vencimento),
              prazo: vencido ? "vencido" : "a vencer",
              valor: brl(c.valorPlano),
            });
            return {
              id: c.id,
              nome: c.nome,
              whatsapp: c.whatsapp as string,
              servicoNome: c.servico?.nome ?? null,
              vencido,
              vencimento: c.vencimento.toISOString(),
              mensagem,
            };
          })}
        />
      )}
    </div>
  );
}
