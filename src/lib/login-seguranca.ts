import { prisma } from "@/lib/prisma";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

// Janela deslizante: bloqueia um e-mail depois de 5 falhas nos últimos 15
// minutos. Some sozinho conforme as tentativas antigas saem da janela.
export async function estaBloqueado(email: string): Promise<boolean> {
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60000);
  const falhas = await prisma.tentativaLogin.count({
    where: { email, sucesso: false, criadoEm: { gte: desde } },
  });
  return falhas >= MAX_TENTATIVAS;
}

export async function registrarTentativa(email: string, sucesso: boolean) {
  await prisma.tentativaLogin.create({ data: { email, sucesso } }).catch(() => {});
}
