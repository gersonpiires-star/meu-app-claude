"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor, exigirDono } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { dataCurta } from "@/lib/format";

const plataformaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do fornecedor"),
  minimo: z.coerce.number().int().min(0).default(0),
});

export async function criarPlataforma(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = plataformaSchema.parse(Object.fromEntries(formData));

  await prisma.plataforma.create({
    data: { revendedorId: revendedor.id, nome: dados.nome, minimo: dados.minimo },
  });

  revalidatePath("/plataformas");
}

const appSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome do app"),
  custoCredito: z.coerce.number().min(0.01, "Informe o custo do crédito"),
  cobrancaTelaExtra: z.coerce.number().min(0).optional(),
});

// Cria um app já vinculado a essa plataforma, com o custo do crédito
// obrigatório — diferente da configuração solta que existia antes em
// Precificação > Apps, aqui o usuário é obrigado a preencher o preço antes
// de conseguir usar a plataforma. Se já existe um app com esse nome (por
// exemplo criado sem querer ao digitar o serviço num cadastro de cliente),
// vincula ele a essa plataforma em vez de dar erro de nome duplicado.
export async function criarAppNaPlataforma(plataformaId: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = appSchema.parse(Object.fromEntries(formData));

  const plataforma = await prisma.plataforma.findUniqueOrThrow({
    where: { id: plataformaId, revendedorId: revendedor.id },
  });

  await prisma.servico.upsert({
    where: { revendedorId_nome: { revendedorId: revendedor.id, nome: dados.nome } },
    update: {
      plataformaId: plataforma.id,
      custoCredito: dados.custoCredito,
      cobrancaTelaExtra: dados.cobrancaTelaExtra ?? null,
    },
    create: {
      revendedorId: revendedor.id,
      nome: dados.nome,
      plataformaId: plataforma.id,
      custoCredito: dados.custoCredito,
      cobrancaTelaExtra: dados.cobrancaTelaExtra ?? null,
    },
  });

  revalidatePath("/plataformas");
}

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

  revalidatePath("/plataformas");
}

const loteSchema = z.object({
  quantidade: z.coerce.number().int().min(1, "Informe a quantidade"),
  valorPago: z.coerce.number().min(0),
});

export async function adicionarLote(plataformaId: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = loteSchema.parse(Object.fromEntries(formData));

  const plataforma = await prisma.plataforma.findUniqueOrThrow({
    where: { id: plataformaId, revendedorId: revendedor.id },
  });

  await prisma.lotePlataforma.create({
    data: { plataformaId: plataforma.id, quantidade: dados.quantidade, valorPago: dados.valorPago },
  });

  revalidatePath("/plataformas");
}

// Corrige um lote já lançado (ex: digitou a quantidade errada) — só o dono,
// mesmo padrão de editarRenovacao/editarVenda: alterar um valor já
// registrado é diferente de lançar um novo.
export async function editarLote(loteId: string, formData: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const revendedor = await exigirDono();
  const dados = loteSchema.safeParse(Object.fromEntries(formData));
  if (!dados.success) return { ok: false, erro: dados.error.issues[0]?.message ?? "Dados inválidos." };

  const lote = await prisma.lotePlataforma.findUnique({
    where: { id: loteId },
    include: { plataforma: true },
  });
  if (!lote || lote.plataforma.revendedorId !== revendedor.id) {
    return { ok: false, erro: "Lote não encontrado." };
  }

  await prisma.lotePlataforma.update({
    where: { id: loteId },
    data: { quantidade: dados.data.quantidade, valorPago: dados.data.valorPago },
  });

  await registrarLog(
    revendedor.id,
    "plataforma.editar_lote",
    `Corrigiu um lote de ${lote.plataforma.nome} (${dataCurta(lote.data)}): quantidade ${lote.quantidade} → ${dados.data.quantidade}, valor pago ${lote.valorPago} → ${dados.data.valorPago}`
  );

  revalidatePath("/plataformas");
  return { ok: true };
}
