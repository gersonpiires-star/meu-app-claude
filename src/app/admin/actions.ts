"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { dataCurta } from "@/lib/format";

export async function liberarAcesso(revendedorId: string, meses: number) {
  await exigirAdmin();
  const revendedor = await prisma.revendedor.findUniqueOrThrow({ where: { id: revendedorId } });
  const base = revendedor.assinaturaVence && revendedor.assinaturaVence > new Date() ? revendedor.assinaturaVence : new Date();
  const vence = new Date(base);
  vence.setMonth(vence.getMonth() + meses);

  await prisma.revendedor.update({
    where: { id: revendedorId },
    data: {
      statusAssinatura: "ATIVO",
      assinaturaVence: vence,
      planoAssinatura: meses >= 12 ? "ANUAL" : "MENSAL",
      pausadoEm: null,
      motivoPausa: null,
    },
  });

  await registrarLog(
    revendedorId,
    "admin.liberar_acesso",
    `Acesso liberado pela Administração GestorPro por ${meses} mês${meses === 1 ? "" : "es"} (vence ${dataCurta(vence)})`,
    "ADMIN"
  );

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
});

export async function publicarAviso(formData: FormData) {
  await exigirAdmin();
  const dados = avisoSchema.parse(Object.fromEntries(formData));

  await prisma.aviso.create({
    data: {
      destino: "TODOS_REVENDEDORES",
      titulo: dados.titulo,
      mensagem: dados.mensagem,
    },
  });

  revalidatePath("/admin/comunicados");
  redirect("/admin/comunicados");
}

export async function excluirAviso(id: string) {
  await exigirAdmin();
  await prisma.aviso.delete({ where: { id, destino: "TODOS_REVENDEDORES" } });
  revalidatePath("/admin/comunicados");
}
