"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor, exigirDono } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";

const schema = z.object({
  mpAccessToken: z.string().trim().optional(),
  mpPublicKey: z.string().trim().optional(),
});

const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
});

export async function salvarPerfil(formData: FormData): Promise<{ erro: string } | undefined> {
  const revendedor = await exigirDono();
  const parsed = perfilSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const whatsapp = parsed.data.whatsapp.replace(/\D/g, "");
  if (whatsapp.length < 10) return { erro: "Informe um WhatsApp válido, com DDD." };

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { nome: parsed.data.nome, whatsapp },
  });

  await registrarLog(revendedor.id, "config.perfil", "Atualizou nome/WhatsApp da conta");

  revalidatePath("/configuracoes");
  revalidatePath("/painel");
}

export async function salvarCredenciaisMP(formData: FormData) {
  const revendedor = await exigirDono();
  const dados = schema.parse(Object.fromEntries(formData));

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: {
      mpAccessToken: dados.mpAccessToken || null,
      mpPublicKey: dados.mpPublicKey || null,
    },
  });

  await registrarLog(revendedor.id, "config.credenciais_mp", "Atualizou as credenciais do Mercado Pago");

  revalidatePath("/configuracoes");
}

export async function removerCredenciaisMP() {
  const revendedor = await exigirDono();
  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { mpAccessToken: null, mpPublicKey: null },
  });
  await registrarLog(revendedor.id, "config.credenciais_mp", "Removeu as credenciais do Mercado Pago");
  revalidatePath("/configuracoes");
}

export async function cancelarAssinatura(formData: FormData) {
  const revendedor = await exigirDono();
  const motivo = String(formData.get("motivo") ?? "").trim();

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { statusAssinatura: "CANCELADO", motivoCancelamento: motivo || null, canceladoEm: new Date() },
  });

  await registrarLog(
    revendedor.id,
    "assinatura.cancelar",
    `Cancelou a assinatura${motivo ? ` — motivo: ${motivo}` : ""}`
  );

  revalidatePath("/configuracoes");
}

export async function salvarSuspensaoAutomatica(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const texto = String(formData.get("diasParaCancelarAutomatico") ?? "").trim();
  const dias = texto ? Number(texto) : null;
  const valido = dias !== null && Number.isInteger(dias) && dias > 0 ? dias : null;

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { diasParaCancelarAutomatico: valido },
  });

  await registrarLog(
    revendedor.id,
    "config.suspensao_automatica",
    valido ? `Definiu suspensão automática para ${valido} dias de atraso` : "Desligou a suspensão automática"
  );

  revalidatePath("/configuracoes");
}
