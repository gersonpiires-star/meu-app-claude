"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function salvarModeloMensagem(chave: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const texto = String(formData.get("texto") ?? "");

  await prisma.modeloMensagem.upsert({
    where: { revendedorId_chave: { revendedorId: revendedor.id, chave } },
    update: { texto },
    create: { revendedorId: revendedor.id, chave, texto },
  });

  revalidatePath("/configuracoes/modelos");
}

export async function restaurarModeloPadrao(chave: string) {
  const revendedor = await exigirRevendedor();
  await prisma.modeloMensagem.deleteMany({ where: { revendedorId: revendedor.id, chave } });
  revalidatePath("/configuracoes/modelos");
}
