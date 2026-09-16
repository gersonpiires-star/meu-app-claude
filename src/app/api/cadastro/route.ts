import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { excedeuLimite, ipDoRequest } from "@/lib/rate-limit";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo"),
  cpf: z.string().trim().optional(),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
  indicadoPorId: z.string().trim().optional(),
  indicadoPorEmail: z.string().trim().email().optional(),
});

export async function POST(request: Request) {
  const ip = ipDoRequest(request);
  if (await excedeuLimite(`cadastro:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Muitas tentativas de cadastro. Tente novamente em alguns minutos." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const { nome, cpf, whatsapp, email, senha, indicadoPorId, indicadoPorEmail } = parsed.data;
  const emailNormalizado = email.toLowerCase();

  // Nunca confia cegamente no id/e-mail vindo do form — só conta como
  // indicação se apontar mesmo pra um revendedor de verdade.
  let indicador: { id: string } | null = null;
  if (indicadoPorId) {
    indicador = await prisma.revendedor.findUnique({ where: { id: indicadoPorId, papel: "REVENDEDOR" }, select: { id: true } });
  } else if (indicadoPorEmail) {
    indicador = await prisma.revendedor.findUnique({
      where: { email: indicadoPorEmail.toLowerCase(), papel: "REVENDEDOR" },
      select: { id: true },
    });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const trialFim = new Date();
  trialFim.setDate(trialFim.getDate() + 7);

  // Revendedor.email e Funcionario.email são @unique cada um na sua própria
  // tabela, sem constraint cruzada entre as duas — sem essa trava por e-mail
  // (mesmo padrão de processarTentativaLogin/criarFuncionario), um cadastro
  // aqui podia colidir com o e-mail de login de um funcionário já existente
  // (nem checado antes) ou com outro cadastro concorrente pro mesmo e-mail.
  const jaExiste = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${emailNormalizado}))`;

    const existente = await tx.revendedor.findUnique({ where: { email: emailNormalizado } });
    const existenteFuncionario = existente ? null : await tx.funcionario.findUnique({ where: { email: emailNormalizado } });
    if (existente || existenteFuncionario) return true;

    await tx.revendedor.create({
      data: {
        nome,
        cpf,
        whatsapp,
        email: emailNormalizado,
        senhaHash,
        trialFim,
        statusAssinatura: "TRIAL",
        indicadoPorId: indicador?.id ?? null,
      },
    });
    return false;
  });

  if (jaExiste) {
    return NextResponse.json({ error: "Já existe uma conta com esse e-mail" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
