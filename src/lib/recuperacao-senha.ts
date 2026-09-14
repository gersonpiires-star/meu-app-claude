import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { enviarEmail } from "@/lib/email";
import { emailRecuperacaoSenha } from "@/lib/email-templates";

const VALIDADE_MINUTOS = 60;
const JANELA_REENVIO_MINUTOS = 2;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function baseUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Sempre silenciosa quanto a existir ou não conta com esse e-mail — um
// formulário público que revela "esse e-mail não tem cadastro" vira uma
// forma fácil de descobrir quem usa o GestorPro (enumeração de contas). O
// comportamento visível pro usuário é sempre o mesmo, exista ou não a conta;
// o e-mail de verdade só sai quando existe.
export async function solicitarRecuperacaoSenha(emailBruto: string): Promise<void> {
  const email = emailBruto.trim().toLowerCase();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;

    const jaEnviadoRecente = await tx.tokenRecuperacaoSenha.findFirst({
      where: { email, criadoEm: { gte: new Date(Date.now() - JANELA_REENVIO_MINUTOS * 60000) } },
    });
    if (jaEnviadoRecente) return; // evita reenvio em sequência (clique duplo, atualizar a página)

    const [revendedor, funcionario] = await Promise.all([
      tx.revendedor.findUnique({ where: { email }, select: { nome: true } }),
      tx.funcionario.findUnique({ where: { email, ativo: true }, select: { nome: true } }),
    ]);
    const nome = revendedor?.nome ?? funcionario?.nome;
    if (!nome) return; // conta não existe (ou funcionário desativado) — não revela isso ao usuário

    const token = crypto.randomBytes(32).toString("hex");
    await tx.tokenRecuperacaoSenha.create({
      data: { email, tokenHash: hashToken(token), expiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60000) },
    });

    const { subject, html } = emailRecuperacaoSenha({
      nome,
      linkRecuperacao: `${baseUrl()}/redefinir-senha?token=${token}`,
    });
    await enviarEmail({ to: email, subject, html });
  });
}

export async function redefinirSenhaComToken(token: string, novaSenhaHash: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const tokenHash = hashToken(token);

  return prisma.$transaction(async (tx) => {
    // Trava pelo próprio token — sem isso, dois cliques/duas abas enviando o
    // mesmo link ao mesmo tempo passavam os dois pela checagem de "ainda não
    // usado" antes de qualquer um marcar como usado.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenHash}))`;

    const registro = await tx.tokenRecuperacaoSenha.findUnique({ where: { tokenHash } });
    if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
      return { ok: false, erro: "Esse link de recuperação é inválido ou já expirou. Peça um novo." };
    }

    const revendedor = await tx.revendedor.findUnique({ where: { email: registro.email }, select: { id: true } });
    if (revendedor) {
      await tx.revendedor.update({ where: { id: revendedor.id }, data: { senhaHash: novaSenhaHash } });
    } else {
      const funcionario = await tx.funcionario.findUnique({ where: { email: registro.email }, select: { id: true } });
      if (!funcionario) return { ok: false, erro: "Conta não encontrada." };
      await tx.funcionario.update({ where: { id: funcionario.id }, data: { senhaHash: novaSenhaHash } });
    }

    // Invalida esse token e qualquer outro pendente pro mesmo e-mail — evita
    // um link antigo (de um pedido anterior não usado) continuar funcionando
    // depois da senha já ter sido trocada.
    await tx.tokenRecuperacaoSenha.updateMany({
      where: { email: registro.email, usadoEm: null },
      data: { usadoEm: new Date() },
    });

    return { ok: true };
  });
}
