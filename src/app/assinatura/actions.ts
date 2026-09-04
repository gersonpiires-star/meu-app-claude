"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { criarPreferencia, tokenPlataforma } from "@/lib/mercadopago";
import { aplicarDesconto, validarCupom } from "@/lib/cupons";

const PLANOS_ASSINATURA = {
  MENSAL: { valor: 29, meses: 1, titulo: "GestorPro — plano mensal" },
  ANUAL: { valor: 290, meses: 12, titulo: "GestorPro — plano anual" },
} as const;

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function iniciarPagamentoAssinatura(formData: FormData) {
  const revendedor = await exigirRevendedor();
  tokenPlataforma(); // lança erro cedo e claro se a plataforma não configurou o MP ainda

  const plano = String(formData.get("plano")) as keyof typeof PLANOS_ASSINATURA;
  if (!(plano in PLANOS_ASSINATURA)) redirect("/assinatura");
  const cupomCodigo = String(formData.get("cupomCodigo") ?? "").trim();

  const { valor: valorBase, meses, titulo } = PLANOS_ASSINATURA[plano];
  let valor: number = valorBase;
  let cupomId: string | null = null;

  if (cupomCodigo) {
    const resultado = await validarCupom(cupomCodigo);
    if ("erro" in resultado) {
      redirect(`/assinatura?erroCupom=${encodeURIComponent(resultado.erro)}`);
    }
    valor = aplicarDesconto(valorBase, resultado.cupom);
    cupomId = resultado.cupom.id;
  }

  const pagamento = await prisma.pagamento.create({
    data: {
      revendedorId: revendedor.id,
      tipo: "ASSINATURA",
      valor,
      meses,
      cupomId,
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
