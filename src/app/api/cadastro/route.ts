import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  cpf: z.string().trim().optional(),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { nome, cpf, whatsapp, email, senha } = parsed.data;
  const emailNormalizado = email.toLowerCase();

  const existente = await prisma.revendedor.findUnique({ where: { email: emailNormalizado } });
  if (existente) {
    return NextResponse.json({ error: "Já existe uma conta com esse e-mail" }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const trialFim = new Date();
  trialFim.setDate(trialFim.getDate() + 7);

  await prisma.revendedor.create({
    data: {
      nome,
      cpf,
      whatsapp,
      email: emailNormalizado,
      senhaHash,
      trialFim,
      statusAssinatura: "TRIAL",
    },
  });

  return NextResponse.json({ ok: true });
}
