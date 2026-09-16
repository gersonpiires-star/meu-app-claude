import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Usado só pra limitar taxa de chamadas em rotas públicas (cadastro,
// recuperação de senha, pagamento), nunca pra identificar usuário de
// verdade — Vercel e a maioria dos proxies mandam o IP real como primeiro
// valor de x-forwarded-for.
export async function ipRequisicao(): Promise<string> {
  const lista = (await headers()).get("x-forwarded-for");
  return lista?.split(",")[0]?.trim() || "desconhecido";
}

export function ipDoRequest(request: Request): string {
  const lista = request.headers.get("x-forwarded-for");
  return lista?.split(",")[0]?.trim() || "desconhecido";
}

// Limite genérico de chamadas por chave numa janela de tempo — mesmo padrão
// de trava do login (processarTentativaLogin em lib/login-seguranca.ts):
// advisory lock pra tentativas em paralelo pra mesma chave não passarem
// todas juntas antes de qualquer uma gravar a sua.
export async function excedeuLimite(chave: string, max: number, janelaMinutos: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chave}))`;

    const desde = new Date(Date.now() - janelaMinutos * 60000);
    const total = await tx.limiteRequisicao.count({ where: { chave, criadoEm: { gte: desde } } });
    if (total >= max) return true;

    await tx.limiteRequisicao.create({ data: { chave } });
    return false;
  });
}
