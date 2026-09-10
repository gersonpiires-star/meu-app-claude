"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor, exigirDono } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { criptografar, descriptografar } from "@/lib/crypto";
import { loginUnitv, ErroUnitv } from "@/lib/integracoes/unitv";

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

const unitvSchema = z.object({
  unitvUsuario: z.string().trim().min(1, "Informe o usuário da UniTV"),
  unitvSenha: z.string().trim().min(1, "Informe a senha da UniTV"),
});

// Guarda o usuário/senha da conta UniTV do revendedor (senha criptografada)
// e já tenta logar uma vez, pra confirmar se as credenciais funcionam —
// evita a pessoa achar que está tudo certo e só descobrir depois que digitou
// a senha errada.
export async function salvarCredenciaisUnitv(formData: FormData): Promise<{ erro: string } | { ok: true }> {
  const revendedor = await exigirDono();
  const parsed = unitvSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  let conectadoEm: Date | null = null;
  try {
    await loginUnitv(parsed.data.unitvUsuario, parsed.data.unitvSenha);
    conectadoEm = new Date();
  } catch (erro) {
    const mensagem = erro instanceof ErroUnitv ? erro.message : "Não foi possível testar a conexão com a UniTV.";
    // Ainda salva as credenciais mesmo se o teste falhar — a integração é
    // beta e o endpoint de login pode estar errado (não implementação
    // verificada), então bloquear o salvamento aqui travaria a pessoa numa
    // credencial que na real pode estar certa.
    await prisma.revendedor.update({
      where: { id: revendedor.id },
      data: { unitvUsuario: parsed.data.unitvUsuario, unitvSenhaCriptografada: criptografar(parsed.data.unitvSenha), unitvConectadoEm: null },
    });
    await registrarLog(revendedor.id, "config.credenciais_unitv", "Salvou credenciais da UniTV (teste de conexão falhou)");
    revalidatePath("/configuracoes");
    return { erro: mensagem };
  }

  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: {
      unitvUsuario: parsed.data.unitvUsuario,
      unitvSenhaCriptografada: criptografar(parsed.data.unitvSenha),
      unitvConectadoEm: conectadoEm,
    },
  });
  await registrarLog(revendedor.id, "config.credenciais_unitv", "Conectou a conta da UniTV");
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function removerCredenciaisUnitv() {
  const revendedor = await exigirDono();
  await prisma.revendedor.update({
    where: { id: revendedor.id },
    data: { unitvUsuario: null, unitvSenhaCriptografada: null, unitvConectadoEm: null },
  });
  await registrarLog(revendedor.id, "config.credenciais_unitv", "Removeu a conexão com a UniTV");
  revalidatePath("/configuracoes");
}

export async function testarConexaoUnitv(): Promise<{ erro: string } | { ok: true }> {
  const revendedor = await exigirDono();
  const atual = await prisma.revendedor.findUnique({
    where: { id: revendedor.id },
    select: { unitvUsuario: true, unitvSenhaCriptografada: true },
  });
  if (!atual?.unitvUsuario || !atual.unitvSenhaCriptografada) return { erro: "Cadastre usuário e senha da UniTV primeiro." };

  try {
    const senha = descriptografar(atual.unitvSenhaCriptografada);
    await loginUnitv(atual.unitvUsuario, senha);
  } catch (erro) {
    await prisma.revendedor.update({ where: { id: revendedor.id }, data: { unitvConectadoEm: null } });
    revalidatePath("/configuracoes");
    return { erro: erro instanceof ErroUnitv ? erro.message : "Não foi possível testar a conexão com a UniTV." };
  }

  await prisma.revendedor.update({ where: { id: revendedor.id }, data: { unitvConectadoEm: new Date() } });
  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function enviarSugestao(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const revendedor = await exigirRevendedor();
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  if (mensagem.length < 5) return { ok: false, erro: "Escreva um pouco mais pra gente entender a sugestão." };

  await prisma.sugestao.create({ data: { revendedorId: revendedor.id, mensagem } });

  await registrarLog(revendedor.id, "config.enviar_sugestao", "Enviou uma sugestão pro time do GestorPro");

  revalidatePath("/admin");
  return { ok: true };
}
