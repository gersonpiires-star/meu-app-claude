"use server";

import { z } from "zod";
import { solicitarRecuperacaoSenha } from "@/lib/recuperacao-senha";
import { excedeuLimite, ipRequisicao } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().trim().email("E-mail inválido") });

export async function pedirRecuperacaoSenha(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  // Limite por IP, não por e-mail — o cooldown por e-mail já existe dentro
  // de solicitarRecuperacaoSenha. Isso trava quem varre vários e-mails
  // diferentes rapidinho a partir do mesmo lugar.
  const ip = await ipRequisicao();
  if (await excedeuLimite(`recuperar-senha:${ip}`, 5, 15)) {
    return { ok: false, erro: "Muitas tentativas — aguarde alguns minutos e tente de novo." };
  }

  await solicitarRecuperacaoSenha(parsed.data.email);
  return { ok: true };
}
