"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redefinirSenhaComToken } from "@/lib/recuperacao-senha";

const schema = z
  .object({
    token: z.string().min(1),
    senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
    confirmarSenha: z.string(),
  })
  .refine((d) => d.senha === d.confirmarSenha, { message: "As senhas não coincidem", path: ["confirmarSenha"] });

export async function redefinirSenha(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
  return redefinirSenhaComToken(parsed.data.token, senhaHash);
}
