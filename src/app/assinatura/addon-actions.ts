"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { criarPreferencia, tokenPlataforma } from "@/lib/mercadopago";
import { ADDON_CLIENTES_PRECO, ADDON_FUNCIONARIO_PRECO } from "@/lib/planos-assinatura";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const ADDONS = {
  ADDON_CLIENTES: { valor: ADDON_CLIENTES_PRECO, titulo: "GestorPro — +50 clientes" },
  ADDON_FUNCIONARIO: { valor: ADDON_FUNCIONARIO_PRECO, titulo: "GestorPro — +1 funcionário" },
} as const;

// Checkout avulso dos add-ons do plano Mensal (ver limitesDoPlano em
// lib/planos-assinatura.ts) — mesmo caminho de iniciarPagamentoAssinatura
// (token da própria plataforma, não do revendedor: é receita do GestorPro,
// não do negócio dele), só que sem cupom/crédito/meses, que não fazem
// sentido pra uma compra avulsa de capacidade extra.
export async function iniciarPagamentoAddon(formData: FormData) {
  const revendedor = await exigirDono();

  const tipo = String(formData.get("tipo"));
  if (tipo !== "ADDON_CLIENTES" && tipo !== "ADDON_FUNCIONARIO") redirect("/assinatura");

  const { valor, titulo } = ADDONS[tipo];

  const pagamento = await prisma.pagamento.create({
    data: { revendedorId: revendedor.id, tipo, valor },
  });

  const preferencia = await criarPreferencia({
    accessToken: tokenPlataforma(),
    pagamentoId: pagamento.id,
    titulo,
    valor: pagamento.valor,
    emailPagador: revendedor.email,
    urlRetorno: `${baseUrl()}/assinatura/retorno?pagamentoId=${pagamento.id}`,
  });

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { mpPreferenceId: preferencia.id },
  });

  redirect(preferencia.init_point ?? preferencia.sandbox_init_point ?? "/assinatura");
}
