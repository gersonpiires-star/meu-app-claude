import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso, fmtTelefone, brl } from "@/lib/format";
import { PLANO_LABEL, faixaVencimento } from "@/lib/planos";
import { mesclarModelos } from "@/lib/mensagens";
import { linkPagamentoCliente } from "@/lib/pagamentos";
import { MensagemWhatsApp } from "../mensagem-whatsapp";

export default async function CobrancaPage({ params }: { params: Promise<{ id: string }> }) {
  const revendedor = await exigirRevendedor();
  const { id } = await params;

  const [cliente, chaves, overridesModelos] = await Promise.all([
    prisma.cliente.findUnique({
      where: { id, revendedorId: revendedor.id },
      include: { servico: true },
    }),
    prisma.chavePix.findMany({ where: { revendedorId: revendedor.id }, orderBy: { criadoEm: "desc" } }),
    prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } }),
  ]);
  if (!cliente) notFound();
  const modelos = mesclarModelos(overridesModelos);
  const faixa = faixaVencimento(cliente.vencimento);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href={`/clientes/${id}`} className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Voltar
      </Link>

      <div>
        <h1 className="text-lg font-bold text-text">Cobrança</h1>
        <p className="text-xs text-text-dim">
          {cliente.nome} · {fmtTelefone(cliente.whatsapp)}
        </p>
      </div>

      <MensagemWhatsApp
        clienteId={id}
        whatsapp={cliente.whatsapp}
        chaves={chaves}
        modelos={modelos}
        linkPagamento={revendedor.mpAccessToken ? linkPagamentoCliente(id) : null}
        dados={{
          nome: cliente.nome,
          app: cliente.servico?.nome ?? "",
          plano: PLANO_LABEL[cliente.plano],
          vencimento: dataPorExtenso(cliente.vencimento),
          prazo: faixa === "VENCIDO" ? "vencido" : "a vencer",
          valor: brl(cliente.valorPlano),
          novoValor: brl(cliente.valorPlano),
        }}
      />
    </div>
  );
}
