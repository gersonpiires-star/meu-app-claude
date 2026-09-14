"use server";

import { z } from "zod";
import { solicitarRecuperacaoSenha } from "@/lib/recuperacao-senha";

const schema = z.object({ email: z.string().trim().email("E-mail inválido") });

export async function pedirRecuperacaoSenha(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  await solicitarRecuperacaoSenha(parsed.data.email);
  return { ok: true };
}
