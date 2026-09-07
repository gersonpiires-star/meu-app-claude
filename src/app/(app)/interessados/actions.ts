"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { parseDataBr } from "@/lib/format";

export async function criarInteressado(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const nome = String(formData.get("nome") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const interesse = String(formData.get("interesse") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();
  const retornarEm = parseDataBr(String(formData.get("retornarEm") ?? ""));
  if (!nome) return;

  await prisma.interessadoCliente.create({
    data: {
      revendedorId: revendedor.id,
      nome,
      whatsapp,
      interesse: interesse || null,
      observacao: observacao || null,
      retornarEm,
    },
  });

  await registrarLog(revendedor.id, "interessado.criar", `Cadastrou o interessado ${nome}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
  redirect("/clientes?aba=interessados");
}

export async function excluirInteressado(id: string) {
  const revendedor = await exigirRevendedor();
  const excluido = await prisma.interessadoCliente.delete({ where: { id, revendedorId: revendedor.id } });
  await registrarLog(revendedor.id, "interessado.excluir", `Removeu o interessado ${excluido.nome}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
}

// Edita os dados de um interessado já cadastrado — sobretudo pra completar
// o telefone quando ele não foi informado na hora do cadastro.
export async function editarInteressado(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const nome = String(formData.get("nome") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const interesse = String(formData.get("interesse") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();
  const retornarEm = parseDataBr(String(formData.get("retornarEm") ?? ""));
  if (!nome) return;

  await prisma.interessadoCliente.update({
    where: { id, revendedorId: revendedor.id },
    data: { nome, whatsapp, interesse: interesse || null, observacao: observacao || null, retornarEm },
  });

  await registrarLog(revendedor.id, "interessado.editar", `Editou os dados de ${nome}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
}
