"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { calcularVencimentoComDiaFixo, PLANO_LABEL, PLANO_VALOR_SUGERIDO } from "@/lib/planos";
import { registrarLog } from "@/lib/log";
import { brl, parseDataBr } from "@/lib/format";
import type { PlanoCliente } from "@/generated/prisma/enums";

const planoSchema = z.enum(["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"]);

const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do cliente"),
  cpf: z.string().trim().optional(),
  // Guarda só os dígitos (mesmo padrão do whatsapp do revendedor) — sem
  // isso um valor tipo "não tem" virava um link quebrado de WhatsApp
  // (wa.me/ sem número) em qualquer lugar que manda mensagem pro cliente.
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\D/g, "") : ""))
    .refine((v) => v === "" || v.length >= 10, "WhatsApp inválido — informe DDD + número"),
  servico: z.string().trim().optional(),
  telas: z.coerce.number().int().min(1).default(1),
  plano: planoSchema,
  valorPlano: z.coerce.number().min(0),
  diaFixo: z.string().trim().optional(),
  testeGratis: z.coerce.boolean().default(false),
  anotacao: z.string().trim().optional(),
  indicadoPorId: z.string().trim().optional(),
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

// Confere que o "indicado por" é mesmo um cliente do revendedor (nunca
// confia no id vindo do form) e não é o próprio cliente sendo editado.
async function resolverIndicadoPor(revendedorId: string, indicadoPorId: string | undefined, proprioId?: string) {
  if (!indicadoPorId || indicadoPorId === proprioId) return null;
  const indicador = await prisma.cliente.findUnique({ where: { id: indicadoPorId, revendedorId } });
  return indicador?.id ?? null;
}

export async function criarCliente(formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = clienteSchema.parse(Object.fromEntries(formData));
  const servicoId = await resolverServico(revendedor.id, dados.servico);
  const indicadoPorId = await resolverIndicadoPor(revendedor.id, dados.indicadoPorId);

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
      indicadoPorId,
      status: "ATIVO",
    },
  });

  await registrarLog(revendedor.id, "cliente.criar", `Cadastrou o cliente ${cliente.nome}`);

  revalidatePath("/clientes");
  revalidatePath("/painel");
  redirect(`/clientes/${cliente.id}`);
}

export async function atualizarCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const dados = clienteSchema.parse(Object.fromEntries(formData));
  const servicoId = await resolverServico(revendedor.id, dados.servico);
  const indicadoPorId = await resolverIndicadoPor(revendedor.id, dados.indicadoPorId, id);

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
      indicadoPorId,
    },
  });

  await registrarLog(revendedor.id, "cliente.editar", `Editou os dados de ${dados.nome}`);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/painel");
  redirect(`/clientes/${id}`);
}

export async function aplicarReajusteCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const novoValor = Number(formData.get("novoValor") ?? 0);
  if (!(novoValor > 0)) return;

  const cliente = await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: { valorPlano: novoValor },
  });

  await registrarLog(revendedor.id, "cliente.reajuste", `Ajustou o plano de ${cliente.nome} para ${brl(novoValor)}`);

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

  await registrarLog(
    revendedor.id,
    "cliente.reajuste_grupo",
    `Ajustou o plano de ${clienteIds.length} clientes para ${brl(novoValor)}`
  );

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

  await registrarLog(revendedor.id, "cliente.renovar", `Renovou o plano de ${cliente.nome} (${PLANO_LABEL[plano]}, ${brl(valor)})`);

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
  revalidatePath("/relatorio");
}

export async function converterTeste(id: string) {
  const revendedor = await exigirRevendedor();
  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id, revendedorId: revendedor.id } });
  if (!cliente.testeGratis) return;

  const novoVencimento = calcularVencimentoComDiaFixo("MENSAL", new Date(), cliente.diaFixo);
  await prisma.cliente.update({
    where: { id },
    data: {
      testeGratis: false,
      plano: "MENSAL",
      valorPlano: PLANO_VALOR_SUGERIDO.MENSAL,
      vencimento: novoVencimento,
      status: "ATIVO",
    },
  });

  await registrarLog(revendedor.id, "cliente.converter_teste", `Converteu ${cliente.nome} de teste grátis para Mensal`);

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
}

export async function cancelarCliente(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const motivo = String(formData.get("motivo") ?? "").trim();

  const cliente = await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: {
      status: "CANCELADO",
      motivoSaida: motivo || null,
      motivoSaidaData: new Date(),
    },
  });

  await registrarLog(
    revendedor.id,
    "cliente.cancelar",
    `Cancelou o cliente ${cliente.nome}${motivo ? ` — motivo: ${motivo}` : ""}`
  );

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
}

export async function corrigirVencimento(id: string, formData: FormData) {
  const revendedor = await exigirRevendedor();
  const texto = String(formData.get("vencimento") ?? "");
  const novoVencimento = parseDataBr(texto);
  if (!novoVencimento) return;

  const cliente = await prisma.cliente.update({
    where: { id, revendedorId: revendedor.id },
    data: { vencimento: novoVencimento },
  });

  await registrarLog(revendedor.id, "cliente.corrigir_vencimento", `Alterou o vencimento de ${cliente.nome} para ${texto}`);

  revalidatePath(`/clientes/${id}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
}

export async function excluirCliente(id: string) {
  const revendedor = await exigirRevendedor();
  const excluido = await prisma.cliente.delete({ where: { id, revendedorId: revendedor.id } });
  await registrarLog(revendedor.id, "cliente.excluir", `Excluiu o cliente ${excluido.nome}`);
  revalidatePath("/clientes");
  revalidatePath("/painel");
  redirect("/clientes");
}
