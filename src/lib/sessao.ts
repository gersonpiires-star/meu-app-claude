import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A sessão (JWT) dura ~30 dias e não é revalidada pelo servidor sozinha —
// sem essa checagem, desativar ou excluir um funcionário (ver
// configuracoes/funcionarios/actions.ts) não tirava o acesso de quem já
// tinha uma sessão aberta até o token expirar. Usado tanto por
// exigirRevendedor quanto pelas páginas de "/" e "/entrar" — as duas
// precisam concordar sobre a sessão estar válida, senão uma manda pra
// "/entrar" e a outra manda de volta pra "/", num loop de redirecionamento.
export async function sessaoValida() {
  const session = await auth();
  if (!session?.user) return null;

  if (session.user.funcionario) {
    const funcionario = await prisma.funcionario.findUnique({ where: { id: session.user.id } });
    if (!funcionario || !funcionario.ativo || funcionario.revendedorId !== session.user.tenantId) {
      return null;
    }
  }

  return session;
}

// Só regrava ultimoAcessoEm se fizer uma hora ou mais desde o último —
// senão toda navegação autenticada (múltiplas por minuto de uso normal)
// viraria um UPDATE, sem ganhar nenhuma precisão útil pro sinal ("ativo
// nos últimos N dias" não precisa de granularidade de minuto).
const THROTTLE_ULTIMO_ACESSO_MS = 60 * 60 * 1000;

// Retorna sempre o Revendedor "dono" do tenant — tanto quando quem logou é
// o próprio dono quanto quando é um funcionário dele (a sessão carrega o
// tenantId, que aponta pro dono). Assim toda a filtragem `revendedorId:
// revendedor.id` espalhada pelo app continua funcionando sem mudar nada.
export async function exigirRevendedor() {
  const session = await sessaoValida();
  if (!session) redirect("/entrar");

  const revendedor = await prisma.revendedor.findUnique({ where: { id: session.user.tenantId ?? session.user.id } });
  if (!revendedor) redirect("/entrar");

  const agora = new Date();
  if (!revendedor.ultimoAcessoEm || agora.getTime() - revendedor.ultimoAcessoEm.getTime() > THROTTLE_ULTIMO_ACESSO_MS) {
    // Aguarda de propósito (não fire-and-forget): numa função serverless a
    // promise pode nunca terminar de rodar se a resposta já foi enviada.
    // Só acontece uma vez por hora por conta (throttle acima), então o
    // custo de latência é desprezível. Falha aqui nunca derruba a página —
    // é só um sinal de uso, não dado crítico.
    await prisma.revendedor.update({ where: { id: revendedor.id }, data: { ultimoAcessoEm: agora } }).catch(() => {});
    revendedor.ultimoAcessoEm = agora;
  }

  return revendedor;
}

// true quando quem está logado é um funcionário (não o dono da conta) —
// usado para esconder/gatear ações sensíveis como credenciais de
// pagamento e gestão de equipe.
export async function souFuncionario() {
  const session = await auth();
  return Boolean(session?.user?.funcionario);
}

// Dono sempre tem as duas; funcionário só se o dono liberou pra ele
// especificamente (ver Funcionario.podeExcluir/podeVerFinanceiro).
export async function permissoesFuncionario(): Promise<{ podeExcluir: boolean; podeVerFinanceiro: boolean }> {
  const session = await auth();
  if (!session?.user?.funcionario) return { podeExcluir: true, podeVerFinanceiro: true };

  const funcionario = await prisma.funcionario.findUnique({
    where: { id: session.user.id },
    select: { podeExcluir: true, podeVerFinanceiro: true },
  });
  return { podeExcluir: funcionario?.podeExcluir ?? false, podeVerFinanceiro: funcionario?.podeVerFinanceiro ?? false };
}

export async function exigirDono() {
  const revendedor = await exigirRevendedor();
  if (await souFuncionario()) redirect("/configuracoes");
  return revendedor;
}

export async function exigirAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  if (session.user.papel !== "ADMIN") redirect("/painel");

  const admin = await prisma.revendedor.findUnique({ where: { id: session.user.id } });
  if (!admin) redirect("/entrar");

  return admin;
}

export function acessoLiberado(revendedor: { statusAssinatura: string; trialFim: Date; assinaturaVence: Date | null }) {
  const agora = new Date();
  if (revendedor.statusAssinatura === "ATIVO") {
    return !revendedor.assinaturaVence || revendedor.assinaturaVence > agora;
  }
  if (revendedor.statusAssinatura === "TRIAL") {
    return revendedor.trialFim > agora;
  }
  return false;
}

// Por que o acesso está bloqueado — usado só pra escolher a mensagem certa
// (pausado pela administração vs. plano/trial vencido, que pede renovação).
// Os dados do revendedor nunca são apagados em nenhum desses casos: o
// bloqueio é só de acesso à tela, tudo que ele salvou continua no banco.
export function motivoBloqueio(revendedor: { statusAssinatura: string; trialFim: Date; assinaturaVence: Date | null }) {
  if (revendedor.statusAssinatura === "PAUSADO") return "PAUSADO" as const;
  if (revendedor.statusAssinatura === "CANCELADO") return "CANCELADO" as const;
  if (revendedor.statusAssinatura === "TRIAL") return "TRIAL_VENCIDO" as const;
  return "ASSINATURA_VENCIDA" as const;
}
