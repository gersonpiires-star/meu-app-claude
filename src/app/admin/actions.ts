"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sessao";

export async function liberarAcesso(revendedorId: string, meses: number) {
  await exigirAdmin();
  const revendedor = await prisma.revendedor.findUniqueOrThrow({ where: { id: revendedorId } });
  const base = revendedor.assinaturaVence && revendedor.assinaturaVence > new Date() ? revendedor.assinaturaVence : new Date();
  const vence = new Date(base);
  vence.setMonth(vence.getMonth() + meses);

  await prisma.revendedor.update({
    where: { id: revendedorId },
    data: { statusAssinatura: "ATIVO", assinaturaVence: vence },
  });

  revalidatePath("/admin/assinantes");
  revalidatePath(`/admin/assinantes/${revendedorId}`);
}

export async function pausarAcesso(revendedorId: string) {
  await exigirAdmin();
  await prisma.revendedor.update({
    where: { id: revendedorId },
    data: { statusAssinatura: "PAUSADO" },
  });
  revalidatePath("/admin/assinantes");
  revalidatePath(`/admin/assinantes/${revendedorId}`);
}

const interessadoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  whatsapp: z.string().trim().min(8, "Informe um WhatsApp válido"),
  interesse: z.string().trim().optional(),
  retornarEm: z.string().trim().optional(),
  observacao: z.string().trim().optional(),
});

export async function criarInteressado(formData: FormData) {
  await exigirAdmin();
  const dados = interessadoSchema.parse(Object.fromEntries(formData));

  await prisma.interessado.create({
    data: {
      nome: dados.nome,
      whatsapp: dados.whatsapp,
      interesse: dados.interesse || null,
      observacao: dados.observacao || null,
      retornarEm: dados.retornarEm ? new Date(dados.retornarEm) : null,
    },
  });

  revalidatePath("/admin/interessados");
}

export async function marcarConvertido(id: string) {
  await exigirAdmin();
  await prisma.interessado.update({ where: { id }, data: { convertido: true } });
  revalidatePath("/admin/interessados");
}

export async function excluirInteressado(id: string) {
  await exigirAdmin();
  await prisma.interessado.delete({ where: { id } });
  revalidatePath("/admin/interessados");
}

const avisoSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título"),
  mensagem: z.string().trim().min(1, "Informe a mensagem"),
});

export async function publicarAviso(formData: FormData) {
  await exigirAdmin();
  const dados = avisoSchema.parse(Object.fromEntries(formData));

  await prisma.aviso.create({
    data: {
      destino: "TODOS_REVENDEDORES",
      titulo: dados.titulo,
      mensagem: dados.mensagem,
    },
  });

  revalidatePath("/admin/comunicados");
  redirect("/admin/comunicados");
}
