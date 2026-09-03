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

export async function marcarConvertido(id: string) {
  const revendedor = await exigirRevendedor();
  const lead = await prisma.interessadoCliente.update({
    where: { id, revendedorId: revendedor.id },
    data: { convertido: true },
  });

  await registrarLog(revendedor.id, "interessado.converter", `${lead.nome} virou cliente`);
  revalidatePath("/clientes");
  revalidatePath("/painel");

  const params = new URLSearchParams({ nome: lead.nome, whatsapp: lead.whatsapp });
  if (lead.interesse) params.set("servico", lead.interesse);
  redirect(`/clientes/novo?${params.toString()}`);
}
