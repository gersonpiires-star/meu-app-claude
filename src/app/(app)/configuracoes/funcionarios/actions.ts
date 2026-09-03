"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
});

export async function criarFuncionario(formData: FormData): Promise<{ erro?: string }> {
  const revendedor = await exigirDono();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const email = parsed.data.email.toLowerCase();
  const existente = await prisma.revendedor.findUnique({ where: { email } });
  const existenteFuncionario = existente ? null : await prisma.funcionario.findUnique({ where: { email } });
  if (existente || existenteFuncionario) return { erro: "Já existe uma conta com esse e-mail." };

  const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
  await prisma.funcionario.create({
    data: { revendedorId: revendedor.id, nome: parsed.data.nome, email, senhaHash },
  });

  await registrarLog(revendedor.id, "funcionario.criar", `Adicionou o funcionário ${parsed.data.nome} (${email})`);

  revalidatePath("/configuracoes/funcionarios");
  return {};
}

export async function alternarFuncionarioAtivo(id: string, ativo: boolean) {
  const revendedor = await exigirDono();
  const funcionario = await prisma.funcionario.update({
    where: { id, revendedorId: revendedor.id },
    data: { ativo },
  });
  await registrarLog(
    revendedor.id,
    "funcionario.alternar",
    `${ativo ? "Reativou" : "Bloqueou"} o funcionário ${funcionario.nome}`
  );
  revalidatePath("/configuracoes/funcionarios");
}

export async function excluirFuncionario(id: string) {
  const revendedor = await exigirDono();
  const excluido = await prisma.funcionario.delete({ where: { id, revendedorId: revendedor.id } });
  await registrarLog(revendedor.id, "funcionario.excluir", `Removeu o funcionário ${excluido.nome}`);
  revalidatePath("/configuracoes/funcionarios");
}
