"use server";

import { curriculoSchema } from "@/lib/curriculo/schema";
import { iniciarPedidoCurriculo } from "@/lib/curriculo/pedidos";
import { excedeuLimite, ipRequisicao } from "@/lib/rate-limit";

export async function iniciarPagamentoCurriculo(entrada: unknown): Promise<{ url: string } | { erro: string }> {
  const validado = curriculoSchema.safeParse(entrada);
  if (!validado.success) {
    return { erro: validado.error.issues[0]?.message ?? "Confira os dados do currículo." };
  }

  // Cada chamada cria um pedido no banco e uma preferência no Mercado Pago.
  if (await excedeuLimite(`curriculo:${await ipRequisicao()}`, 8, 10)) {
    return { erro: "Muitas tentativas — aguarde alguns minutos e tente de novo." };
  }

  return iniciarPedidoCurriculo(validado.data);
}
