"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { criarPreferencia, tokenPlataforma } from "@/lib/mercadopago";
import { aplicarDesconto, validarCupom } from "@/lib/cupons";
import { PLANOS_ASSINATURA } from "@/lib/planos-assinatura";
import { aprovarAssinaturaPaga } from "@/lib/pagamentos";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

class CupomEsgotadoError extends Error {}

export async function iniciarPagamentoAssinatura(formData: FormData) {
  // A assinatura do GestorPro é conta/cobrança do dono — um funcionário não
  // deveria conseguir gerar cobrança, trocar de plano nem aplicar cupom
  // nessa assinatura (mesmo padrão já usado em cancelarAssinatura).
  const revendedor = await exigirDono();

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

      // Abate o saldoCreditos (bonificado pelo admin — ver "Enviar créditos"
      // no painel dele) do valor já com cupom aplicado, até o limite do que
      // sobrou pra cobrar. Mesma reserva atômica condicional do cupom acima:
      // sem o guard "saldoCreditos >= creditoDesejado", duas abas abrindo
      // checkout ao mesmo tempo podiam gastar o mesmo crédito duas vezes.
      let creditoAplicado = 0;
      if (revendedor.saldoCreditos > 0 && valor > 0) {
        const creditoDesejado = Math.min(revendedor.saldoCreditos, valor);
        const linhasAfetadas = await tx.$executeRaw`
          UPDATE "Revendedor"
          SET "saldoCreditos" = "saldoCreditos" - ${creditoDesejado}
          WHERE id = ${revendedor.id} AND "saldoCreditos" >= ${creditoDesejado}
        `;
        if (linhasAfetadas > 0) {
          creditoAplicado = creditoDesejado;
          // Mesmo arredondamento de aplicarDesconto (cupons.ts) — sem isso,
          // subtração de Float podia deixar um resíduo tipo 0.00000000001
          // em vez de exatamente 0, e o "valor <= 0" abaixo falhava em
          // detectar que o crédito cobriu o pagamento inteiro.
          valor = Math.max(0, Math.round((valor - creditoAplicado) * 100) / 100);
        }
      }

      return tx.pagamento.create({
        data: {
          revendedorId: revendedor.id,
          tipo: "ASSINATURA",
          valor,
          meses,
          cupomId,
          creditoAplicado,
        },
      });
    });
  } catch (erro) {
    if (erro instanceof CupomEsgotadoError) {
      redirect(`/assinatura?erroCupom=${encodeURIComponent("Esse cupom acabou de atingir o limite de usos — tente de novo sem cupom.")}`);
    }
    throw erro;
  }

  // Crédito cobriu o valor inteiro (com ou sem cupom junto) — não tem nada
  // a cobrar no Mercado Pago, então ativa direto pelo mesmo caminho que o
  // webhook usa pra um pagamento de verdade aprovado. valorLiquido 0 porque
  // nenhum dinheiro novo entrou (é bonificação já dada antes pelo admin).
  if (pagamento.valor <= 0) {
    await aprovarAssinaturaPaga(pagamento.id, `CREDITO-${pagamento.id}`, 0);
    redirect(`/assinatura/retorno?pagamentoId=${pagamento.id}`);
  }

  const preferencia = await criarPreferencia({
    accessToken: tokenPlataforma(), // lança erro cedo e claro se a plataforma não configurou o MP ainda
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
