import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buscarPagamentoMP, tokenPlataforma } from "@/lib/mercadopago";
import { aprovarRenovacaoPaga } from "@/lib/pagamentos";
import { planoDosMeses, adicionarMeses } from "@/lib/planos-assinatura";
import { enviarPush } from "@/lib/push";
import { registrarLog } from "@/lib/log";

function extrairPaymentId(url: URL, corpo: unknown): string | null {
  const porQuery = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (porQuery) return porQuery;

  if (corpo && typeof corpo === "object") {
    const dados = corpo as { data?: { id?: string | number }; type?: string; topic?: string };
    if (dados.data?.id) return String(dados.data.id);
  }
  return null;
}

function ehNotificacaoDePagamento(url: URL, corpo: unknown): boolean {
  const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
  if (topic) return topic === "payment";
  if (corpo && typeof corpo === "object") {
    const dados = corpo as { type?: string };
    if (dados.type) return dados.type === "payment";
  }
  return true;
}

function statusMPParaInterno(status: string): "APROVADO" | "RECUSADO" | "CANCELADO" | "PENDENTE" {
  if (status === "approved") return "APROVADO";
  if (status === "rejected") return "RECUSADO";
  if (status === "cancelled" || status === "refunded" || status === "charged_back") return "CANCELADO";
  return "PENDENTE";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => null);

  if (!ehNotificacaoDePagamento(url, corpo)) {
    return NextResponse.json({ ok: true });
  }

  const pagamentoId = url.searchParams.get("pagamentoId");
  const mpPaymentId = extrairPaymentId(url, corpo);
  if (!pagamentoId || !mpPaymentId) {
    return NextResponse.json({ ok: true, ignorado: "sem identificadores" });
  }

  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: { revendedor: { include: { pushSubscriptions: true } }, cliente: true },
  });
  if (!pagamento) {
    return NextResponse.json({ ok: true, ignorado: "pagamento não encontrado" });
  }

  const accessToken = pagamento.tipo === "ASSINATURA" ? tokenPlataforma() : pagamento.revendedor.mpAccessToken;
  if (!accessToken) {
    console.error(`Webhook MP: revendedor ${pagamento.revendedorId} sem token para pagamento ${pagamento.id}`);
    // Responder 2xx aqui diria ao Mercado Pago "processado com sucesso" e ele
    // pararia de reenviar essa notificação — se o revendedor só reconectar o
    // token depois, o pagamento ficaria PENDENTE pra sempre sem nenhum outro
    // gatilho pra reconferir. Um status de erro faz o MP tentar de novo mais
    // tarde, dando chance de o token já estar corrigido na próxima entrega.
    return NextResponse.json({ ok: false, ignorado: "sem token" }, { status: 503 });
  }

  let pagamentoMP;
  try {
    pagamentoMP = await buscarPagamentoMP(accessToken, mpPaymentId);
  } catch (erro) {
    console.error("Webhook MP: falha ao consultar pagamento na API", erro);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Nunca confiar no corpo do webhook: a fonte de verdade é a resposta da
  // API do Mercado Pago, buscada com o token correto. Conferimos ainda que
  // a referência bate com o pagamento que esperávamos.
  if (pagamentoMP.external_reference !== pagamentoId) {
    console.error(`Webhook MP: external_reference não confere para pagamento ${pagamentoId}`);
    return NextResponse.json({ ok: true, ignorado: "referência não confere" });
  }

  const novoStatus = statusMPParaInterno(pagamentoMP.status ?? "pending");

  if (novoStatus !== "APROVADO") {
    await prisma.$transaction(async (tx) => {
      const trocou = await tx.pagamento.updateMany({
        where: { id: pagamento.id, status: { notIn: ["RECUSADO", "CANCELADO", "APROVADO"] } },
        data: { status: novoStatus, mpPaymentId: String(pagamentoMP.id) },
      });

      // Libera o uso do cupom (reservado no checkout, em iniciarPagamentoAssinatura)
      // só na primeira vez que esse pagamento chega a um status final de
      // falha — sem essa trava, o Mercado Pago reentregando a mesma
      // notificação devolveria o uso do cupom mais de uma vez, inflando o
      // saldo de usos disponíveis pra além do limite real.
      if (trocou.count > 0 && pagamento.cupomId && (novoStatus === "RECUSADO" || novoStatus === "CANCELADO")) {
        await tx.$executeRaw`
          UPDATE "Cupom" SET "usosCount" = GREATEST("usosCount" - 1, 0) WHERE id = ${pagamento.cupomId}
        `;
      }
    });

    // Pagamento de assinatura recusado: avisa o próprio revendedor (não só
    // o admin, que já recebe isso no resumo diário) com um link direto pra
    // tentar de novo — sem isso ele só descobria quando o acesso pausasse.
    if (novoStatus === "RECUSADO" && pagamento.tipo === "ASSINATURA") {
      for (const inscricao of pagamento.revendedor.pushSubscriptions) {
        const manter = await enviarPush(inscricao, {
          titulo: "Pagamento não aprovado",
          corpo: "Seu pagamento da assinatura do GestorPro não foi aprovado. Toque para tentar de novo.",
          url: "/assinatura",
        });
        if (!manter) {
          await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Renovação de cliente: aprovar o pagamento e aplicar o efeito (estender
  // vencimento, registrar a renovação, avisar o revendedor) é idêntico pro
  // Asaas — mora num helper compartilhado em vez de duplicado aqui.
  if (pagamento.tipo === "RENOVACAO") {
    const resultado = await aprovarRenovacaoPaga(pagamentoId, String(pagamentoMP.id), "mpPaymentId");
    return NextResponse.json({ ok: true, ignorado: resultado.jaProcessado ? "já processado" : undefined });
  }

  // Só resta ASSINATURA daqui pra baixo — pagamento da própria mensalidade
  // do GestorPro, que tem efeitos (indicação, cupom) que não existem pra
  // RENOVACAO e por isso não entraram no helper compartilhado.
  //
  // O Mercado Pago reenvia notificações do mesmo pagamento (rotina pro Pix),
  // então duas entregas podem chegar em paralelo. A troca de status só
  // acontece se AINDA não estava "APROVADO" — updateMany com esse filtro é
  // atômica no Postgres (a segunda entrega concorrente fica bloqueada pelo
  // lock de linha da primeira até ela comitar, e então reavalia o filtro e
  // não encontra mais a linha pra atualizar) — e o side-effect (estender
  // assinatura) roda dentro da mesma transação, então nunca fica pela metade
  // nem roda duas vezes pro mesmo pagamento.
  const resultado = await prisma.$transaction(async (tx) => {
    const trocou = await tx.pagamento.updateMany({
      where: { id: pagamento.id, status: { not: "APROVADO" } },
      data: { status: novoStatus, mpPaymentId: String(pagamentoMP.id) },
    });
    if (trocou.count === 0) return { jaProcessado: true };

    let recompensaIndicacao: { indicadorId: string; codigo: string } | null = null;

    // Trava a linha do revendedor antes de ler o status — sem isso, duas
    // aprovações concorrentes da primeira assinatura da mesma conta (ex:
    // dois pagamentos pendentes, dois webhooks quase simultâneos) podiam
    // ambas ler statusAssinatura ainda como TRIAL (uma SELECT simples não
    // espera o UPDATE da outra comitar) e conceder 2 cupons de indicação
    // pra 1 conversão só. Com o FOR UPDATE, a segunda só lê depois que a
    // primeira já comitou o ATIVO.
    await tx.$queryRaw`SELECT 1 FROM "Revendedor" WHERE id = ${pagamento.revendedorId} FOR UPDATE`;
    const revendedorAtual = await tx.revendedor.findUniqueOrThrow({ where: { id: pagamento.revendedorId } });
    // TRIAL aqui significa que essa pessoa nunca tinha pago o GestorPro
    // antes — é a conversão de verdade que a recompensa de indicação
    // recompensa. Reativação de PAUSADO/CANCELADO não conta de novo.
    const primeiraAssinaturaPaga = revendedorAtual.statusAssinatura === "TRIAL";
    const meses = pagamento.meses ?? 1;
    const base =
      revendedorAtual.assinaturaVence && revendedorAtual.assinaturaVence > new Date()
        ? revendedorAtual.assinaturaVence
        : new Date();
    const vence = adicionarMeses(base, meses);

    await tx.revendedor.update({
      where: { id: pagamento.revendedorId },
      data: {
        statusAssinatura: "ATIVO",
        assinaturaVence: vence,
        planoAssinatura: planoDosMeses(meses),
      },
    });

    // Receita que de fato entra pra Administração GestorPro — o Mercado
    // Pago desconta a taxa dele antes de repassar. net_received_amount é
    // o valor líquido que a própria API do MP devolve pra esse pagamento;
    // sem ele (ou transaction_amount), cai pro preço cheio cobrado do
    // revendedor em vez de quebrar a aprovação por causa disso.
    const valorLiquido =
      pagamentoMP.transaction_details?.net_received_amount ?? pagamentoMP.transaction_amount ?? pagamento.valor;
    await tx.pagamento.update({ where: { id: pagamento.id }, data: { valorLiquido } });

    // O uso do cupom já foi reservado atomicamente no checkout (ver
    // iniciarPagamentoAssinatura) — reservar só na aprovação permitia dois
    // checkouts concorrentes lerem o mesmo cupom de uso único ainda livre e
    // criarem dois pagamentos já com o preço descontado, antes de qualquer
    // trava existir; só o contador (não o preço já fixado) ficava protegido
    // aqui. Se esse pagamento for recusado/cancelado, o uso é devolvido ao
    // cupom no branch de status não aprovado, acima.

    // Recompensa de indicação: quem indicou essa conta ganha um cupom de
    // 15% pra usar na própria próxima renovação — só dispara na primeira
    // assinatura paga de quem foi indicado, nunca em renovações seguintes.
    if (primeiraAssinaturaPaga && revendedorAtual.indicadoPorId) {
      const codigo = `INDIC${pagamento.id.slice(-8).toUpperCase()}`;
      const validoAte = new Date();
      validoAte.setDate(validoAte.getDate() + 180);

      await tx.cupom.create({
        data: {
          codigo,
          tipo: "PERCENTUAL",
          valor: 15,
          revendedorId: revendedorAtual.indicadoPorId,
          usoMaximo: 1,
          validoAte,
        },
      });
      await tx.aviso.create({
        data: {
          destino: "UM_REVENDEDOR",
          revendedorId: revendedorAtual.indicadoPorId,
          tipo: "GERAL",
          titulo: "Você ganhou 15% de desconto por indicar o GestorPro!",
          mensagem: `${revendedorAtual.nome} assinou o GestorPro usando o seu link de indicação. Como agradecimento, você ganhou o cupom ${codigo} — 15% de desconto na sua próxima renovação. É só usar o código na hora de renovar, em Assinatura.`,
        },
      });
      recompensaIndicacao = { indicadorId: revendedorAtual.indicadoPorId, codigo };
    }
    return { jaProcessado: false, recompensaIndicacao };
  });

  if (!resultado.jaProcessado && resultado.recompensaIndicacao) {
    const { indicadorId, codigo } = resultado.recompensaIndicacao;
    await registrarLog(
      indicadorId,
      "indicacao.recompensa",
      `Ganhou o cupom ${codigo} (15% de desconto) por indicar ${pagamento.revendedor.nome}, que assinou o GestorPro`
    );

    const indicador = await prisma.revendedor.findUnique({
      where: { id: indicadorId },
      include: { pushSubscriptions: true },
    });
    for (const inscricao of indicador?.pushSubscriptions ?? []) {
      const manter = await enviarPush(inscricao, {
        titulo: "Você ganhou 15% de desconto!",
        corpo: `${pagamento.revendedor.nome} assinou usando seu link de indicação. Use o cupom ${codigo} na próxima renovação.`,
        url: "/assinatura",
      });
      if (!manter) {
        await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, ignorado: resultado.jaProcessado ? "já processado" : undefined });
}

export async function GET(request: Request) {
  return POST(request);
}
