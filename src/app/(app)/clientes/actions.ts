"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { calcularVencimento } from "@/lib/planos";
import type { PlanoCliente } from "@/generated/prisma/enums";

const planoSchema = z.enum(["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"]);

const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente"),
  cpf: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  servico: z.string().trim().optional(),
  telas: z.coerce.number().int().min(1).default(1),
  plano: planoSchema,
  valorPlano: z.coerce.number().min(0),
  testeGratis: z.coerce.boolean().default(false),
  anotacao: z.string().trim().optional(),
});

async function resolverServico(revendedorId: string, nome?: string) {
  const nomeLimpo = nome?.trim();
  if (!nomeLimpo) return null;
  const servico = await prisma.servico.upsert({
    where: { revendedorId_nome: { revendedorId, nome: nomeLimpo } },
    update: {},
    create: { revendedorId, nome: nomeLimpo },
  });
  return servico.id;
}

export async function criarCliente(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = clienteSchema.parse(Object.fromEntries(formData));
  const servicoId = await resolverServico(revendedor.id, dados.servico);

  const cliente = await prisma.cliente.create({
    data: {
      revendedorId: revendedor.id,
      servicoId,
      nome: dados.nome,
      cpf: dados.cpf || null,
      whatsapp: dados.whatsapp || null,
      telas: dados.telas,
      plano: dados.plano as PlanoCliente,
      valorPlano: dados.valorPlano,
      testeGratis: dados.testeGratis,
      vencimento: calcularVencimento(dados.plano as PlanoCliente),
      anotacao: dados.anotacao || null,
      status: "ATIVO",
    },
  });

  revalidatePath("/clientes");
  revalidatePath("/painel");
  redirect(`/clientes/${cliente.id}`);
}

export async function atualizarCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = clienteSchema.parse(Object.fromEntries(formData));
  const servicoId = await resolverServico(revendedor.id, dados.servico);

  await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: {
      servicoId,
      nome: dados.nome,
      cpf: dados.cpf || null,
      whatsapp: dados.whatsapp || null,
      telas: dados.telas,
      plano: dados.plano as PlanoCliente,
      valorPlano: dados.valorPlano,
      testeGratis: dados.testeGratis,
      anotacao: dados.anotacao || null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/painel");
  redirect(`/clientes/${id}`);
}

export async function renovarCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const plano = planoSchema.parse(formData.get("plano"));
  const valor = Number(formData.get("valor") ?? 0);
  const custo = Number(formData.get("custo") ?? 0);

  const cliente = await prisma.cliente.findUniqueOrThrow({
    where: { id, revendedorId: revendedor.id },
  });

  const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
  const novoVencimento = calcularVencimento(plano, base);

  await prisma.$transaction([
    prisma.renovacao.create({
      data: { clienteId: id, plano, valor, custo },
    }),
    prisma.cliente.update({
      where: { id },
      data: {
        plano,
        valorPlano: valor,
        vencimento: novoVencimento,
        status: "ATIVO",
        testeGratis: false,
      },
    }),
  ]);

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
  revalidatePath("/relatorio");
}

export async function cancelarCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const motivo = String(formData.get("motivo") ?? "").trim();

  await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: {
      status: "CANCELADO",
      motivoSaida: motivo || null,
      motivoSaidaData: new Date(),
    },
  });

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
}

export async function excluirCliente(id: string) {
  const revendedor = await exigirRevendedor();
  await prisma.cliente.delete({ where: { id, revendedorId: revendedor.id } });
  revalidatePath("/clientes");
  revalidatePath("/painel");
  redirect("/clientes");
}
