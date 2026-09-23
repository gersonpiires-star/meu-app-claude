"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { brl } from "@/lib/format";

const creditoSchema = z.object({
  revendedorId: z.string().min(1, "Selecione uma conta"),
  quantidade: z.coerce.number(),
  observacao: z.string().trim().optional(),
});

export async function enviarCreditos(formData: FormData): Promise<{ erro: string } | undefined> {
  await exigirAdmin();
  const dados = creditoSchema.parse(Object.fromEntries(formData));
  if (dados.quantidade === 0) return { erro: "Informe uma quantidade diferente de zero." };

  const conta = await prisma.revendedor.findUnique({ where: { id: dados.revendedorId } });
  if (!conta) return { erro: "Conta não encontrada." };

  await prisma.$transaction([
    prisma.revendedor.update({
      where: { id: dados.revendedorId },
      data: { saldoCreditos: { increment: dados.quantidade } },
    }),
    prisma.creditoConta.create({
      data: { revendedorId: dados.revendedorId, quantidade: dados.quantidade, observacao: dados.observacao || null },
    }),
  ]);

  await registrarLog(
    dados.revendedorId,
    "admin.creditos",
    `Recebeu ${brl(dados.quantidade)} de crédito da administração${dados.observacao ? ` — ${dados.observacao}` : ""}`,
    "ADMIN"
  );

  revalidatePath("/administracao");
}
