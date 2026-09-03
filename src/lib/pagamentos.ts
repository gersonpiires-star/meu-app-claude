import { prisma } from "@/lib/prisma";
import { criarPreferencia } from "@/lib/mercadopago";
import { PLANO_MESES } from "@/lib/planos";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function linkPagamentoCliente(clienteId: string) {
  return `${baseUrl()}/pagar/${clienteId}`;
}

// Usado tanto pela cobrança manual (revendedor logado) quanto pela página
// pública /pagar/[clienteId] — por isso não recebe revendedorId: o cliente
// já carrega a relação com o dono da cobrança.
export async function criarPagamentoRenovacao(clienteId: string): Promise<{ url: string } | { erro: string }> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { servico: true, revendedor: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };
  if (cliente.status === "CANCELADO") return { erro: "Este cliente está cancelado." };
  if (!cliente.revendedor.mpAccessToken) {
    return { erro: "Pagamento online ainda não está disponível — fale com quem te atende." };
  }

  const pagamento = await prisma.pagamento.create({
    data: {
      revendedorId: cliente.revendedorId,
      clienteId: cliente.id,
      tipo: "RENOVACAO",
      plano: cliente.plano,
      valor: cliente.valorPlano,
      custo: PLANO_MESES[cliente.plano],
    },
  });

  try {
    const preferencia = await criarPreferencia({
      accessToken: cliente.revendedor.mpAccessToken,
      pagamentoId: pagamento.id,
      titulo: `Renovação ${cliente.servico?.nome ?? "plano"} — ${cliente.nome}`,
      valor: cliente.valorPlano,
      urlRetorno: `${baseUrl()}/pagamento/retorno?pagamentoId=${pagamento.id}`,
    });

    await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: { mpPreferenceId: preferencia.id },
    });

    const url = preferencia.init_point ?? preferencia.sandbox_init_point;
    if (!url) return { erro: "O Mercado Pago não retornou um link de pagamento." };
    return { url };
  } catch (erro) {
    console.error("Falha ao criar preferência de pagamento no Mercado Pago", erro);
    return { erro: "Não foi possível gerar o link de pagamento agora. Tente novamente em instantes." };
  }
}
