"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { dataCurta } from "@/lib/format";
import { planoDosMeses, adicionarMeses } from "@/lib/planos-assinatura";

// `valor`, quando informado, é um pagamento recebido fora do Mercado Pago
// (ex: Pix direto no WhatsApp) que o admin está registrando manualmente —
// sem isso, "Liberar acesso" só estendia o vencimento e o dinheiro recebido
// nunca aparecia em Receita da plataforma, MRR nem no histórico de
// pagamentos do assinante (que somam a tabela Pagamento). Como não passou
// pelo Mercado Pago, não tem taxa a descontar: valorLiquido = valor cheio.
export async function liberarAcesso(revendedorId: string, meses: number, valor?: number) {
  await exigirAdmin();
  const revendedor = await prisma.revendedor.findUniqueOrThrow({ where: { id: revendedorId } });
  const base = revendedor.assinaturaVence && revendedor.assinaturaVence > new Date() ? revendedor.assinaturaVence : new Date();
  const vence = adicionarMeses(base, meses);

  // Mesma regra do webhook do Mercado Pago: a recompensa de indicação só
  // vale na primeira assinatura paga de quem foi indicado (TRIAL virando
  // pagante), nunca em renovações seguintes ou em liberações de cortesia
  // (sem valor).
  const primeiraAssinaturaPaga = Boolean(valor && valor > 0 && revendedor.statusAssinatura === "TRIAL");
  let recompensaIndicacao: { indicadorId: string; codigo: string } | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.revendedor.update({
      where: { id: revendedorId },
      data: {
        statusAssinatura: "ATIVO",
        assinaturaVence: vence,
        planoAssinatura: planoDosMeses(meses),
        pausadoEm: null,
        motivoPausa: null,
      },
    });

    if (valor && valor > 0) {
      const pagamento = await tx.pagamento.create({
        data: {
          revendedorId,
          tipo: "ASSINATURA",
          valor,
          valorLiquido: valor,
          meses,
          status: "APROVADO",
        },
      });

      if (primeiraAssinaturaPaga && revendedor.indicadoPorId) {
        const codigo = `INDIC${pagamento.id.slice(-8).toUpperCase()}`;
        const validoAte = new Date();
        validoAte.setDate(validoAte.getDate() + 180);

        await tx.cupom.create({
          data: {
            codigo,
            tipo: "PERCENTUAL",
            valor: 15,
            revendedorId: revendedor.indicadoPorId,
            usoMaximo: 1,
            validoAte,
          },
        });
        await tx.aviso.create({
          data: {
            destino: "UM_REVENDEDOR",
            revendedorId: revendedor.indicadoPorId,
            tipo: "GERAL",
            titulo: "Você ganhou 15% de desconto por indicar o GestorPro!",
            mensagem: `${revendedor.nome} assinou o GestorPro usando o seu link de indicação. Como agradecimento, você ganhou o cupom ${codigo} — 15% de desconto na sua próxima renovação. É só usar o código na hora de renovar, em Assinatura.`,
          },
        });
        recompensaIndicacao = { indicadorId: revendedor.indicadoPorId, codigo };
      }
    }
  });

  await registrarLog(
    revendedorId,
    "admin.liberar_acesso",
    `Acesso liberado pela Administração GestorPro por ${meses} mês${meses === 1 ? "" : "es"} (vence ${dataCurta(vence)})${valor ? ` — pagamento de ${valor} registrado manualmente` : ""}`,
    "ADMIN"
  );

  if (recompensaIndicacao) {
    const { indicadorId, codigo }: { indicadorId: string; codigo: string } = recompensaIndicacao;
    await registrarLog(
      indicadorId,
      "indicacao.recompensa",
      `Ganhou o cupom ${codigo} (15% de desconto) por indicar ${revendedor.nome}, que assinou o GestorPro`
    );
  }

  revalidatePath("/admin/assinantes");
  revalidatePath(`/admin/assinantes/${revendedorId}`);
}

export async function pausarAcesso(revendedorId: string, motivo: string) {
  await exigirAdmin();
  const motivoLimpo = motivo.trim();
  if (!motivoLimpo) throw new Error("Informe o motivo da pausa");

  await prisma.revendedor.update({
    where: { id: revendedorId },
    data: { statusAssinatura: "PAUSADO", pausadoEm: new Date(), motivoPausa: motivoLimpo },
  });

  await registrarLog(
    revendedorId,
    "admin.pausar_acesso",
    `Acesso pausado pela Administração GestorPro — motivo: ${motivoLimpo}`,
    "ADMIN"
  );

  revalidatePath("/admin/assinantes");
  revalidatePath(`/admin/assinantes/${revendedorId}`);
}

// Retoma sem adicionar tempo novo — só reabre o acesso conforme o que já
// estava válido (assinatura ou trial). Se nenhum dos dois ainda vale, o
// revendedor volta a ver a tela de "plano vencido" pra renovar, em vez de
// ganhar acesso liberado de graça.
export async function retomarAcesso(revendedorId: string) {
  await exigirAdmin();
  const revendedor = await prisma.revendedor.findUniqueOrThrow({ where: { id: revendedorId } });
  const agora = new Date();
  const novoStatus =
    revendedor.assinaturaVence && revendedor.assinaturaVence > agora
      ? "ATIVO"
      : revendedor.trialFim > agora
        ? "TRIAL"
        : "ATIVO";

  await prisma.revendedor.update({
    where: { id: revendedorId },
    data: { statusAssinatura: novoStatus, pausadoEm: null, motivoPausa: null },
  });

  await registrarLog(revendedorId, "admin.retomar_acesso", "Acesso retomado pela Administração GestorPro", "ADMIN");

  revalidatePath("/admin/assinantes");
  revalidatePath(`/admin/assinantes/${revendedorId}`);
}

const interessadoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
  interesse: z.string().trim().optional(),
  retornarEm: z.string().trim().optional(),
  observacao: z.string().trim().optional(),
});

export async function criarInteressado(formData: FormData) {
  await exigirAdmin();
  const dados = interessadoSchema.parse(Object.fromEntries(formData));

  await prisma.interessado.create({
    data: {
      nome: dados.nome,
      whatsapp: dados.whatsapp,
      interesse: dados.interesse || null,
      observacao: dados.observacao || null,
      retornarEm: dados.retornarEm ? new Date(dados.retornarEm) : null,
    },
  });

  revalidatePath("/admin/interessados");
}

export async function marcarConvertido(id: string) {
  await exigirAdmin();
  await prisma.interessado.update({ where: { id }, data: { convertido: true } });
  revalidatePath("/admin/interessados");
}

export async function excluirInteressado(id: string) {
  await exigirAdmin();
  await prisma.interessado.delete({ where: { id } });
  revalidatePath("/admin/interessados");
}

const avisoSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título"),
  mensagem: z.string().trim().min(1, "Informe a mensagem"),
  destinatarioId: z.string().trim().optional(),
  tipo: z.enum(["GERAL", "ATUALIZACAO"]).optional().default("GERAL"),
});

export async function publicarAviso(formData: FormData) {
  await exigirAdmin();
  const dados = avisoSchema.parse(Object.fromEntries(formData));

  await prisma.aviso.create({
    data: dados.destinatarioId
      ? { destino: "UM_REVENDEDOR", revendedorId: dados.destinatarioId, tipo: dados.tipo, titulo: dados.titulo, mensagem: dados.mensagem }
      : { destino: "TODOS_REVENDEDORES", tipo: dados.tipo, titulo: dados.titulo, mensagem: dados.mensagem },
  });

  revalidatePath("/admin/comunicados");
  redirect("/admin/comunicados");
}

export async function excluirAviso(id: string) {
  await exigirAdmin();
  await prisma.aviso.delete({ where: { id, destino: { in: ["TODOS_REVENDEDORES", "UM_REVENDEDOR"] } } });
  revalidatePath("/admin/comunicados");
}

export async function marcarSugestaoLida(id: string) {
  await exigirAdmin();
  await prisma.sugestao.update({ where: { id }, data: { lida: true } });
  revalidatePath("/admin");
  revalidatePath("/admin/sugestoes");
}

export async function alternarDestaqueSugestao(id: string, destaque: boolean) {
  await exigirAdmin();
  await prisma.sugestao.update({ where: { id }, data: { destaque } });
  revalidatePath("/admin");
  revalidatePath("/admin/sugestoes");
}
