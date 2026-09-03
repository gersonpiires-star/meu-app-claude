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

// Retorna sempre o Revendedor "dono" do tenant — tanto quando quem logou é
// o próprio dono quanto quando é um funcionário dele (a sessão carrega o
// tenantId, que aponta pro dono). Assim toda a filtragem `revendedorId:
// revendedor.id` espalhada pelo app continua funcionando sem mudar nada.
export async function exigirRevendedor() {
  const session = await sessaoValida();
  if (!session) redirect("/entrar");

  const revendedor = await prisma.revendedor.findUnique({ where: { id: session.user.tenantId ?? session.user.id } });
  if (!revendedor) redirect("/entrar");

  return revendedor;
}

// true quando quem está logado é um funcionário (não o dono da conta) —
// usado para esconder/gatear ações sensíveis como credenciais de
// pagamento e gestão de equipe.
export async function souFuncionario() {
  const session = await auth();
  return Boolean(session?.user?.funcionario);
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
