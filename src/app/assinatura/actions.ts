"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { criarPreferencia, tokenPlataforma } from "@/lib/mercadopago";

const PLANOS_ASSINATURA = {
  MENSAL: { valor: 29, meses: 1, titulo: "GestorPro — plano mensal" },
  ANUAL: { valor: 290, meses: 12, titulo: "GestorPro — plano anual" },
} as const;

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function iniciarPagamentoAssinatura(plano: keyof typeof PLANOS_ASSINATURA) {
  const revendedor = await exigirRevendedor();
  tokenPlataforma(); // lança erro cedo e claro se a plataforma não configurou o MP ainda

  const { valor, meses, titulo } = PLANOS_ASSINATURA[plano];

  const pagamento = await prisma.pagamento.create({
    data: {
      revendedorId: revendedor.id,
      tipo: "ASSINATURA",
      valor,
      meses,
    },
  });

  const preferencia = await criarPreferencia({
    accessToken: tokenPlataforma(),
    pagamentoId: pagamento.id,
    titulo,
    valor,
    emailPagador: revendedor.email,
    urlRetorno: `${baseUrl()}/assinatura/retorno?pagamentoId=${pagamento.id}`,
  });

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { mpPreferenceId: preferencia.id },
  });

  redirect(preferencia.init_point ?? preferencia.sandbox_init_point ?? "/assinatura");
}
