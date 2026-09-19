"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { criarPreferencia, tokenPlataforma } from "@/lib/mercadopago";
import { aplicarDesconto, validarCupom } from "@/lib/cupons";
import { PLANOS_ASSINATURA } from "@/lib/planos-assinatura";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

class CupomEsgotadoError extends Error {}

export async function iniciarPagamentoAssinatura(formData: FormData) {
  // A assinatura do GestorPro é conta/cobrança do dono — um funcionário não
  // deveria conseguir gerar cobrança, trocar de plano nem aplicar cupom
  // nessa assinatura (mesmo padrão já usado em cancelarAssinatura).
  const revendedor = await exigirDono();
  tokenPlataforma(); // lança erro cedo e claro se a plataforma não configurou o MP ainda

  const plano = String(formData.get("plano")) as keyof typeof PLANOS_ASSINATURA;
  if (!(plano in PLANOS_ASSINATURA)) redirect("/assinatura");
  const cupomCodigo = String(formData.get("cupomCodigo") ?? "").trim();

  const { valor: valorBase, meses, titulo } = PLANOS_ASSINATURA[plano];
  let valor: number = valorBase;
  let cupomId: string | null = null;

  if (cupomCodigo) {
    const resultado = await validarCupom(cupomCodigo, revendedor.id);
    if ("erro" in resultado) {
      redirect(`/assinatura?erroCupom=${encodeURIComponent(resultado.erro)}`);
    }
    valor = aplicarDesconto(valorBase, resultado.cupom);
    cupomId = resultado.cupom.id;
  }

  let pagamento;
  try {
    pagamento = await prisma.$transaction(async (tx) => {
      if (cupomId) {
        // Reserva o uso do cupom atomicamente no mesmo passo em que cria o
        // pagamento com o desconto já aplicado. Sem isso, validarCupom só
        // lia usosCount (sem travar nada) e o pagamento descontado já era
        // criado aqui — duas abas abrindo checkout quase juntas com o mesmo
        // cupom de uso único passavam as duas por essa leitura, geravam
        // dois pagamentos descontados, e só o CONTADOR (não o preço já
        // fixado) era protegido depois, na aprovação do webhook — a segunda
        // aprovação falhava em incrementar o contador mas o pagamento
        // continuava aprovado com desconto. Agora a reserva é a mesma
        // atualização condicional atômica, só que roda aqui, antes do preço
        // ser fixado.
        const linhasAfetadas = await tx.$executeRaw`
          UPDATE "Cupom"
          SET "usosCount" = "usosCount" + 1
          WHERE id = ${cupomId}
            AND ("usoMaximo" IS NULL OR "usosCount" < "usoMaximo")
        `;
        if (linhasAfetadas === 0) throw new CupomEsgotadoError();
      }
      return tx.pagamento.create({
        data: {
          revendedorId: revendedor.id,
          tipo: "ASSINATURA",
          valor,
          meses,
          cupomId,
        },
      });
    });
  } catch (erro) {
    if (erro instanceof CupomEsgotadoError) {
      redirect(`/assinatura?erroCupom=${encodeURIComponent("Esse cupom acabou de atingir o limite de usos — tente de novo sem cupom.")}`);
    }
    throw erro;
  }

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
