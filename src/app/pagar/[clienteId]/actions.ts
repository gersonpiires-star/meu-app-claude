"use server";

import { criarPagamentoRenovacao } from "@/lib/pagamentos";
import { excedeuLimite, ipRequisicao } from "@/lib/rate-limit";

export async function gerarLinkPagamentoPublico(clienteId: string): Promise<{ url: string } | { erro: string }> {
  const ip = await ipRequisicao();
  // Chave por cliente + IP: trava tanto quem clica repetido no mesmo link
  // quanto alguém varrendo vários clienteId a partir do mesmo lugar — cada
  // clique aqui cria um Pagamento novo e chama a API do Mercado Pago.
  if (await excedeuLimite(`pagar:${clienteId}:${ip}`, 5, 5)) {
    return { erro: "Muitas tentativas — aguarde alguns minutos e tente de novo." };
  }
  return criarPagamentoRenovacao(clienteId);
}
