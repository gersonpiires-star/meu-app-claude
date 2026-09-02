"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { calcularVencimentoComDiaFixo } from "@/lib/planos";
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
  diaFixo: z.string().trim().optional(),
  testeGratis: z.coerce.boolean().default(false),
  anotacao: z.string().trim().optional(),
});

function parseDiaFixo(texto?: string): number | null {
  if (!texto) return null;
  const n = Number(texto);
  if (!Number.isInteger(n) || n < 1 || n > 31) return null;
  return n;
}

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
      diaFixo: parseDiaFixo(dados.diaFixo),
      testeGratis: dados.testeGratis,
      vencimento: calcularVencimentoComDiaFixo(dados.plano as PlanoCliente, new Date(), parseDiaFixo(dados.diaFixo)),
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
      diaFixo: parseDiaFixo(dados.diaFixo),
      testeGratis: dados.testeGratis,
      anotacao: dados.anotacao || null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/painel");
  redirect(`/clientes/${id}`);
}

export async function aplicarReajusteCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const novoValor = Number(formData.get("novoValor") ?? 0);
  if (!(novoValor > 0)) return;

  await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: { valorPlano: novoValor },
  });

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
}

export async function aplicarReajusteEmGrupo(clienteIds: string[], novoValor: number) {
  const revendedor = await exigirRevendedor();
  if (!(novoValor > 0) || clienteIds.length === 0) return;

  await prisma.cliente.updateMany({
    where: { id: { in: clienteIds }, revendedorId: revendedor.id },
    data: { valorPlano: novoValor },
  });

  revalidatePath("/clientes");
  revalidatePath("/painel");
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
  const novoVencimento = calcularVencimentoComDiaFixo(plano, base, cliente.diaFixo);

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

export async function corrigirVencimento(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const texto = String(formData.get("vencimento") ?? "");
  const [dia, mes, ano] = texto.split("/").map(Number);
  if (!dia || !mes || !ano) return;

  await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: { vencimento: new Date(ano, mes - 1, dia) },
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
