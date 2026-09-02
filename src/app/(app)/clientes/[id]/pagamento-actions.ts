"use server";

import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { criarPreferencia } from "@/lib/mercadopago";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function gerarLinkPagamentoCliente(clienteId: string): Promise<{ url: string } | { erro: string }> {
  const revendedor = await exigirRevendedor();
  if (!revendedor.mpAccessToken) {
    return { erro: "Configure suas credenciais do Mercado Pago em Configurações primeiro." };
  }

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId, revendedorId: revendedor.id },
    include: { servico: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };

  const pagamento = await prisma.pagamento.create({
    data: {
      revendedorId: revendedor.id,
      clienteId: cliente.id,
      tipo: "RENOVACAO",
      plano: cliente.plano,
      valor: cliente.valorPlano,
    },
  });

  try {
    const preferencia = await criarPreferencia({
      accessToken: revendedor.mpAccessToken,
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
    return { erro: "Não foi possível gerar o link. Confira se o Access Token em Configurações está correto." };
  }
}
