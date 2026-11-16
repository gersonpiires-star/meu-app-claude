"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";

const cupomSchema = z.object({
  codigo: z.string().trim().min(3, "O código precisa de pelo menos 3 caracteres"),
  tipo: z.enum(["PERCENTUAL", "FIXO"]),
  valor: z.coerce.number().positive("Informe um valor de desconto maior que zero"),
  validoAte: z.string().trim().optional(),
  usoMaximo: z.string().trim().optional(),
  revendedorId: z.string().trim().optional(),
  expiraQuantidade: z.string().trim().optional(),
  expiraUnidade: z.enum(["horas", "dias"]).optional(),
});

export async function criarCupom(formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  await exigirAdmin();
  const parsed = cupomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const dados = parsed.data;
  const codigo = dados.codigo.toUpperCase();

  if (dados.tipo === "PERCENTUAL" && dados.valor > 100) {
    return { ok: false, erro: "Desconto percentual não pode passar de 100%." };
  }

  const existente = await prisma.cupom.findUnique({ where: { codigo } });
  if (existente) {
    return { ok: false, erro: `Já existe um cupom com o código ${codigo}.` };
  }

  const usoMaximo = dados.usoMaximo ? Number(dados.usoMaximo) : null;

  // "Expira em X horas/dias" tem prioridade sobre a data fixa — é o jeito
  // de dar um prazo curto e preciso (ex: cupom de uma negociação pontual)
  // sem precisar calcular a data na mão.
  let validoAte: Date | null = dados.validoAte ? new Date(`${dados.validoAte}T23:59:59.000Z`) : null;
  const expiraQuantidade = dados.expiraQuantidade ? Number(dados.expiraQuantidade) : null;
  if (expiraQuantidade && expiraQuantidade > 0) {
    const horas = dados.expiraUnidade === "dias" ? expiraQuantidade * 24 : expiraQuantidade;
    validoAte = new Date(Date.now() + horas * 60 * 60 * 1000);
  }

  await prisma.cupom.create({
    data: {
      codigo,
      tipo: dados.tipo,
      valor: dados.valor,
      validoAte,
      usoMaximo: usoMaximo && usoMaximo > 0 ? Math.floor(usoMaximo) : null,
      revendedorId: dados.revendedorId || null,
    },
  });

  // Só dá pra logar na conta de um revendedor específico — cupom global
  // (sem revendedorId) não tem pra onde registrar (Cupom não é um tenant).
  if (dados.revendedorId) {
    await registrarLog(dados.revendedorId, "admin.cupom_criado", `Recebeu o cupom ${codigo} da Administração GestorPro`, "ADMIN");
  }

  revalidatePath("/admin/cupons");
  return { ok: true };
}

export async function alternarCupomAtivo(id: string, ativo: boolean) {
  await exigirAdmin();
  const cupom = await prisma.cupom.update({ where: { id }, data: { ativo } });
  if (cupom.revendedorId) {
    await registrarLog(
      cupom.revendedorId,
      "admin.cupom_alternar",
      `A Administração GestorPro ${ativo ? "reativou" : "desativou"} o cupom ${cupom.codigo}`,
      "ADMIN"
    );
  }
  revalidatePath("/admin/cupons");
}

// Só deixa excluir cupom que não está mais valendo (desativado, expirado
// ou esgotado) — evita apagar por engano um cupom ainda rodando numa
// campanha. Pagamentos que já usaram o cupom não são afetados:
// Pagamento.cupomId vira null (onDelete: SetNull no schema).
export async function excluirCupom(id: string) {
  await exigirAdmin();
  const cupom = await prisma.cupom.findUniqueOrThrow({ where: { id } });
  const expirado = cupom.validoAte ? cupom.validoAte < new Date() : false;
  const esgotado = cupom.usoMaximo != null && cupom.usosCount >= cupom.usoMaximo;
  const efetivamenteAtivo = cupom.ativo && !expirado && !esgotado;
  if (efetivamenteAtivo) {
    throw new Error("Desative o cupom antes de excluir.");
  }
  await prisma.cupom.delete({ where: { id } });
  if (cupom.revendedorId) {
    await registrarLog(cupom.revendedorId, "admin.cupom_excluir", `A Administração GestorPro excluiu o cupom ${cupom.codigo}`, "ADMIN");
  }
  revalidatePath("/admin/cupons");
}
