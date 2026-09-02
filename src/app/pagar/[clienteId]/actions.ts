"use server";

import { criarPagamentoRenovacao } from "@/lib/pagamentos";

export async function gerarLinkPagamentoPublico(clienteId: string) {
  return criarPagamentoRenovacao(clienteId);
}
