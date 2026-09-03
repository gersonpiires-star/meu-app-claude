import { prisma } from "@/lib/prisma";

const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

// Checa o bloqueio, roda a verificação de senha (bcrypt) e grava a tentativa
// tudo dentro de uma trava por e-mail (pg_advisory_xact_lock) — sem isso,
// checagem e gravação eram dois passos separados (a checagem em
// estaBloqueado(), a gravação bem depois, já em auth.ts), e vários logins em
// paralelo pro mesmo e-mail liam a contagem de falhas antes de qualquer um
// deles gravar a sua, todos passando pela checagem juntos e ultrapassando o
// limite de 5 tentativas na janela de 15 min. A trava serializa isso: cada
// tentativa só começa depois que a anterior (pro mesmo e-mail) já gravou a
// sua e liberou a trava.
//
// Enquanto bloqueado, a tentativa NÃO é gravada de propósito — assim o
// bloqueio se auto-limpa 15 min depois da última falha real, em vez de ser
// renovado indefinidamente por quem continua tentando durante o bloqueio.
export async function processarTentativaLogin<T>(
  email: string,
  verificarCredenciais: () => Promise<T | null>
): Promise<T | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;

    const desde = new Date(Date.now() - JANELA_MINUTOS * 60000);
    const falhas = await tx.tentativaLogin.count({
      where: { email, sucesso: false, criadoEm: { gte: desde } },
    });
    if (falhas >= MAX_TENTATIVAS) return null;

    const resultado = await verificarCredenciais();
    await tx.tentativaLogin.create({ data: { email, sucesso: resultado !== null } });
    return resultado;
  });
}
