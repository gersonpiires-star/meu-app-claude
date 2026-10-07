import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { dataCurta } from "@/lib/format";

export const WINBACK_PERCENTUAL_DESCONTO = 20;
export const WINBACK_DIAS_VALIDADE_CUPOM = 30;

// Cupom de uso único, escopado ao revendedor — mesmo padrão do cupom de
// recompensa de indicação (ver aprovarAssinaturaPaga em lib/pagamentos.ts),
// só com prefixo diferente pra nunca colidir com aquele código. O código é
// determinístico (deriva só do revendedorId) de propósito: se o cron rodar
// duas vezes no mesmo dia pro mesmo revendedor, a segunda tentativa bate na
// constraint única do código e retorna null em vez de mandar o e-mail de
// novo — dá pra contar com isso como a própria trava de duplicidade, sem
// precisar de uma tabela só pra marcar "já enviado" (mesmo raciocínio do
// catch de P2002 no fechamento de mês, abaixo no cron).
export async function gerarCupomWinback(revendedorId: string): Promise<{ codigo: string; validoAteFormatado: string } | null> {
  const codigo = `VOLTA${revendedorId.slice(-8).toUpperCase()}`;
  const validoAte = new Date();
  validoAte.setDate(validoAte.getDate() + WINBACK_DIAS_VALIDADE_CUPOM);

  try {
    await prisma.cupom.create({
      data: {
        codigo,
        tipo: "PERCENTUAL",
        valor: WINBACK_PERCENTUAL_DESCONTO,
        revendedorId,
        usoMaximo: 1,
        validoAte,
      },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") return null;
    throw erro;
  }

  return { codigo, validoAteFormatado: dataCurta(validoAte) };
}

// Revendedores que cancelaram a assinatura exatamente há N dias (civil, em
// horário de Brasília) — mesma lógica de "match exato de um único dia" que
// o restante do cron já usa pra nutrição de trial, pra disparar o e-mail
// de win-back uma única vez por cancelamento, sem precisar de uma tabela
// de controle só pra marcar "já enviado".
export async function buscarCanceladosParaWinback(inicio: Date, fim: Date) {
  return prisma.revendedor.findMany({
    where: { papel: "REVENDEDOR", statusAssinatura: "CANCELADO", canceladoEm: { gte: inicio, lt: fim } },
    select: { id: true, nome: true, email: true },
  });
}
