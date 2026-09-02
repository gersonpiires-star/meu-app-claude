import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function exigirRevendedor() {
  const session = await auth();
  if (!session?.user) redirect("/entrar");

  const revendedor = await prisma.revendedor.findUnique({ where: { id: session.user.id } });
  if (!revendedor) redirect("/entrar");

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
