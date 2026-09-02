"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

const servicoConfigSchema = z.object({
  plataformaId: z.string().trim().optional(),
  custoCredito: z.coerce.number().min(0).optional(),
  cobrancaTelaExtra: z.coerce.number().min(0).optional(),
});

export async function atualizarConfigServico(servicoId: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = servicoConfigSchema.parse(Object.fromEntries(formData));

  await prisma.servico.update({
    where: { id: servicoId, revendedorId: revendedor.id },
    data: {
      plataformaId: dados.plataformaId || null,
      custoCredito: dados.custoCredito ?? null,
      cobrancaTelaExtra: dados.cobrancaTelaExtra ?? null,
    },
  });

  revalidatePath("/precificacao");
}
