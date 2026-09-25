import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { criarPreferencia } from "@/lib/mercadopago";
import { criarCobrancaAsaas } from "@/lib/asaas";
import { PLANO_MESES } from "@/lib/planos";
import { calcularVencimento } from "@/lib/planos";
import { snapshotDoCliente } from "@/lib/renovacao";
import { enviarPush } from "@/lib/push";
import { erroCreditoIndisponivel } from "@/lib/plataformas";
import { registrarLog } from "@/lib/log";
import { planoDosMeses, adicionarMeses } from "@/lib/planos-assinatura";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function linkPagamentoCliente(clienteId: string) {
  return `${baseUrl()}/pagar/${clienteId}`;
}

// Se tem gateway configurado pra gerar link de pagamento — usado tanto na
// cobrança manual quanto na página pública, pra decidir se mostra o botão
// de pagamento online (o gateway ativo é o único usado; ter o outro também
// com credencial salva não importa aqui).
export function temGatewayConfigurado(revendedor: {
  gatewayPagamento: "MERCADOPAGO" | "ASAAS";
  mpAccessToken: string | null;
  asaasApiKey: string | null;
}): boolean {
  return revendedor.gatewayPagamento === "ASAAS" ? Boolean(revendedor.asaasApiKey) : Boolean(revendedor.mpAccessToken);
}

// Usado tanto pela cobrança manual (revendedor logado) quanto pela página
// pública /pagar/[clienteId] — por isso não recebe revendedorId: o cliente
// já carrega a relação com o dono da cobrança.
export async function criarPagamentoRenovacao(clienteId: string): Promise<{ url: string } | { erro: string }> {
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: { servico: true, revendedor: true },
  });
  if (!cliente) return { erro: "Cliente não encontrado." };
  if (cliente.status === "CANCELADO") return { erro: "Este cliente está cancelado." };

  const custo = PLANO_MESES[cliente.plano] * (cliente.servico?.custoCredito ?? 0);

  if (cliente.revendedor.gatewayPagamento === "ASAAS") {
    if (!cliente.revendedor.asaasApiKey) {
      return { erro: "Pagamento online ainda não está disponível — fale com quem te atende." };
    }
    if (!cliente.cpf) {
      return { erro: "Pagamento online exige o CPF/CNPJ do cliente cadastrado — peça pra quem te atende completar o cadastro." };
    }

    const pagamento = await prisma.pagamento.create({
      data: {
        revendedorId: cliente.revendedorId,
        clienteId: cliente.id,
        tipo: "RENOVACAO",
        plano: cliente.plano,
        valor: cliente.valorPlano,
        custo,
      },
    });

    try {
      const { url, asaasPaymentId } = await criarCobrancaAsaas({
        apiKey: cliente.revendedor.asaasApiKey,
        pagamentoId: pagamento.id,
        clienteNome: cliente.nome,
        cpfCnpj: cliente.cpf,
        valor: cliente.valorPlano,
      });
      await prisma.pagamento.update({ where: { id: pagamento.id }, data: { asaasPaymentId } });
      return { url };
    } catch (erro) {
      console.error("Falha ao criar cobrança no Asaas", erro);
      return { erro: "Não foi possível gerar o link de pagamento agora. Tente novamente em instantes." };
    }
  }

  if (!cliente.revendedor.mpAccessToken) {
    return { erro: "Pagamento online ainda não está disponível — fale com quem te atende." };
  }

  const pagamento = await prisma.pagamento.create({
    data: {
      revendedorId: cliente.revendedorId,
      clienteId: cliente.id,
      tipo: "RENOVACAO",
      plano: cliente.plano,
      valor: cliente.valorPlano,
      custo,
    },
  });

  try {
    const preferencia = await criarPreferencia({
      accessToken: cliente.revendedor.mpAccessToken,
      pagamentoId: pagamento.id,
      titulo: `Renovação ${cliente.servico?.nome ?? "plano"} — ${cliente.nome}`,
      valor: cliente.valorPlano,
      urlRetorno: `${baseUrl()}/pagamento/retorno?pagamentoId=${pagamento.id}`,
    });

    await prisma.pagamento.update({
      where: { id: pagamento.id },
      data: { mpPreferenceId: preferencia.id },
    });

    const url = preferencia.init_point ?? preferencia.sandbox_init_point;
    if (!url) return { erro: "O Mercado Pago não retornou um link de pagamento." };
    return { url };
  } catch (erro) {
    console.error("Falha ao criar preferência de pagamento no Mercado Pago", erro);
    return { erro: "Não foi possível gerar o link de pagamento agora. Tente novamente em instantes." };
  }
}

// Efeito de aprovar o pagamento de uma RENOVACAO — compartilhado pelos
// webhooks do Mercado Pago e do Asaas, já que o resultado (estender o
// cliente, registrar a renovação, avisar o revendedor) é idêntico nos dois
// gateways. Cada webhook já confirmou o status direto na API do gateway
// antes de chamar isso — aqui só se confia no pagamentoId, nunca em status
// vindo do corpo do webhook.
export async function aprovarRenovacaoPaga(
  pagamentoId: string,
  gatewayPaymentId: string,
  campoGateway: "mpPaymentId" | "asaasPaymentId"
): Promise<{ jaProcessado: boolean }> {
  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: { revendedor: { include: { pushSubscriptions: true } }, cliente: true },
  });
  if (!pagamento || pagamento.tipo !== "RENOVACAO" || !pagamento.clienteId || !pagamento.plano) {
    return { jaProcessado: true };
  }

  // Mesma trava por updateMany condicional usada no webhook do MP: duas
  // entregas concorrentes do mesmo pagamento nunca aplicam a renovação duas
  // vezes — a segunda encontra o status já "APROVADO" e não bate no WHERE.
  // Isolamento serializable pelo mesmo motivo das renovações manuais
  // (renovarCliente/renovarComPlanoAtual): sem isso, duas renovações desse
  // cliente por gateways/canais concorrentes podiam ler o vencimento antigo
  // ao mesmo tempo.
  const resultado = await prisma.$transaction(
    async (tx) => {
      const trocou = await tx.pagamento.updateMany({
        where: { id: pagamento.id, status: { not: "APROVADO" } },
        data: { status: "APROVADO", [campoGateway]: gatewayPaymentId },
      });
      if (trocou.count === 0) return { jaProcessado: true, semCredito: false };

      const cliente = await tx.cliente.findUnique({ where: { id: pagamento.clienteId! } });
      if (!cliente) return { jaProcessado: false, semCredito: false };

      // O cliente já pagou de verdade nesse ponto — diferente da renovação
      // manual, não dá pra simplesmente recusar por falta de crédito na
      // plataforma (isso deixaria o pagamento cobrado sem o serviço
      // correspondente). Em vez de bloquear, aplica a renovação normalmente
      // mas sinaliza pro revendedor resolver o crédito, pra não ficar um
      // saldo negativo silencioso na plataforma como as renovações manuais
      // já evitam.
      const erroCredito = await erroCreditoIndisponivel(tx, cliente.servicoId);

      const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
      const novoVencimento = calcularVencimento(pagamento.plano!, base);

      await tx.renovacao.create({
        data: {
          clienteId: cliente.id,
          servicoId: cliente.servicoId,
          plano: pagamento.plano!,
          valor: pagamento.valor,
          custo: pagamento.custo,
          snapshotAnterior: snapshotDoCliente(cliente),
        },
      });
      await tx.cliente.update({
        where: { id: cliente.id },
        data: {
          plano: pagamento.plano!,
          valorPlano: pagamento.valor,
          vencimento: novoVencimento,
          status: "ATIVO",
          testeGratis: false,
        },
      });
      await tx.notificacaoPagamento.create({
        data: {
          revendedorId: pagamento.revendedorId,
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          valor: pagamento.valor,
        },
      });

      return { jaProcessado: false, semCredito: Boolean(erroCredito) };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  if (!resultado.jaProcessado && pagamento.cliente) {
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${pagamento.cliente.id}`);
    revalidatePath("/painel");
    revalidatePath("/relatorio");
    revalidatePath("/plataformas");

    for (const inscricao of pagamento.revendedor.pushSubscriptions) {
      const manter = await enviarPush(
        inscricao,
        resultado.semCredito
          ? {
              titulo: "Renovação sem crédito na plataforma",
              corpo: `${pagamento.cliente.nome} pagou e já foi renovado, mas a plataforma dele ficou sem créditos — compre mais créditos em Plataformas.`,
              url: "/plataformas",
            }
          : {
              titulo: "Pagamento recebido",
              corpo: `${pagamento.cliente.nome} pagou a renovação pelo link — já está tudo atualizado.`,
              url: `/clientes/${pagamento.cliente.id}`,
            }
      );
      if (!manter) {
        await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
      }
    }
  }

  return { jaProcessado: resultado.jaProcessado };
}

// Efeito de aprovar um pagamento de ASSINATURA (mensalidade do GestorPro) —
// compartilhado entre o webhook do Mercado Pago (pagamento real) e o
// checkout quando o saldoCreditos do revendedor cobre o valor inteiro, sem
// gateway nenhum envolvido (ver iniciarPagamentoAssinatura). Cada chamador
// já garantiu que esse pagamento deve ser considerado pago; aqui só se
// confia no pagamentoId. gatewayPaymentId precisa ser único por chamada —
// pro caminho 100% crédito, o chamador passa algo como `CREDITO-${id}`,
// já que mpPaymentId tem constraint @unique.
export async function aprovarAssinaturaPaga(
  pagamentoId: string,
  gatewayPaymentId: string,
  valorLiquido: number
): Promise<{ jaProcessado: boolean }> {
  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId },
    include: { revendedor: true },
  });
  if (!pagamento || pagamento.tipo !== "ASSINATURA") {
    return { jaProcessado: true };
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const trocou = await tx.pagamento.updateMany({
      where: { id: pagamento.id, status: { not: "APROVADO" } },
      data: { status: "APROVADO", mpPaymentId: gatewayPaymentId, valorLiquido },
    });
    if (trocou.count === 0) {
      return { jaProcessado: true, recompensaIndicacao: null as { indicadorId: string; codigo: string } | null };
    }

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
        // Mesmo reset que liberarAcesso já faz — sem isso, uma conta que já
        // tinha sido pausada antes continua aparecendo como "Bloqueada" no
        // admin mesmo já reativada.
        pausadoEm: null,
        motivoPausa: null,
      },
    });

    // Recompensa de indicação: quem indicou essa conta ganha um cupom de
    // 15% pra usar na própria próxima renovação — só dispara na primeira
    // assinatura paga de quem foi indicado, nunca em renovações seguintes.
    let recompensaIndicacao: { indicadorId: string; codigo: string } | null = null;
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

  return { jaProcessado: resultado.jaProcessado };
}
