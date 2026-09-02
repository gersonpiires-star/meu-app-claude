"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import type { PlanoCliente } from "@/generated/prisma/enums";

function serialParaData(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

function normalizarWhatsapp(tel?: string | null): string | null {
  if (!tel) return null;
  const digitos = tel.replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.startsWith("55") ? digitos : `55${digitos}`;
}

const PLANO_MAP: Record<string, PlanoCliente> = {
  Mensal: "MENSAL",
  "2 meses": "DOIS_MESES",
  Bimestral: "DOIS_MESES",
  Trimensal: "TRIMESTRAL",
  Trimestral: "TRIMESTRAL",
  Semestral: "SEMESTRAL",
};

function mapearPlano(texto?: string | null): PlanoCliente {
  if (!texto) return "MENSAL";
  for (const [chave, valor] of Object.entries(PLANO_MAP)) {
    if (texto.includes(chave)) return valor;
  }
  return "MENSAL";
}

const clienteAntigoSchema = z.object({
  id: z.number(),
  app: z.string().optional(),
  tel: z.string().optional(),
  nome: z.string(),
  nota: z.string().optional(),
  venc: z.number(),
  plano: z.string().optional(),
  valor: z.number().optional().default(0),
  inicio: z.number().optional(),
  telas: z.number().optional(),
  teste: z.boolean().optional(),
  inativo: z.boolean().optional(),
});

const entradaAntigaSchema = z.object({
  qtd: z.number(),
  data: z.string().optional(),
  custo: z.number().optional().default(0),
});

const modeloAntigoSchema = z.object({
  id: z.number(),
  nome: z.string(),
  minimo: z.number().optional().default(0),
  entradas: z.array(entradaAntigaSchema).optional().default([]),
});

const vendaAntigaSchema = z.object({
  qtd: z.number(),
  data: z.string().optional(),
  unit: z.number(),
  modeloId: z.number().optional(),
  pagamento: z.string().optional(),
});

const recebimentoAntigoSchema = z.object({
  data: z.string().optional(),
  tipo: z.string().optional(),
  custo: z.number().optional().default(0),
  valor: z.number().optional().default(0),
  clienteId: z.number().optional(),
});

const importSchema = z.object({
  dados: z.object({
    clientes: z.array(clienteAntigoSchema).optional().default([]),
    modelos: z.array(modeloAntigoSchema).optional().default([]),
    vendas: z.array(vendaAntigaSchema).optional().default([]),
    recebimentos: z.array(recebimentoAntigoSchema).optional().default([]),
  }),
});

function parseData(texto?: string): Date {
  if (!texto) return new Date();

  if (texto.includes("/")) {
    const [dia, mes, ano] = texto.split("/").map(Number);
    if (dia && mes && ano) return new Date(ano, mes - 1, dia);
  }

  if (texto.includes("-")) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    if (dia && mes && ano) return new Date(ano, mes - 1, dia);
  }

  return new Date();
}

export async function importarDadosAntigos(
  formData: FormData
): Promise<{ ok: true; resumo: string } | { ok: false; erro: string }> {
  const revendedor = await exigirRevendedor();
  const texto = String(formData.get("json") ?? "").trim();
  if (!texto) return { ok: false, erro: "Cole o conteúdo do arquivo de backup primeiro." };

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse texto não é um JSON válido." };
  }

  const parsed = importSchema.safeParse(bruto);
  if (!parsed.success) {
    return { ok: false, erro: "O JSON não tem o formato esperado do backup do app antigo." };
  }
  const { clientes, modelos, vendas, recebimentos } = parsed.data.dados;

  const servicoIdPorNome = new Map<string, string>();
  const clienteIdAntigoParaNovo = new Map<number, string>();
  const produtoIdAntigoParaNovo = new Map<number, string>();

  for (const nome of new Set(clientes.map((c) => c.app).filter((v): v is string => Boolean(v)))) {
    const servico = await prisma.servico.upsert({
      where: { revendedorId_nome: { revendedorId: revendedor.id, nome } },
      update: {},
      create: { revendedorId: revendedor.id, nome },
    });
    servicoIdPorNome.set(nome, servico.id);
  }

  for (const c of clientes) {
    const criado = await prisma.cliente.create({
      data: {
        revendedorId: revendedor.id,
        servicoId: c.app ? servicoIdPorNome.get(c.app) ?? null : null,
        nome: c.nome,
        whatsapp: normalizarWhatsapp(c.tel),
        telas: c.telas ?? 1,
        plano: mapearPlano(c.plano),
        valorPlano: c.valor ?? 0,
        vencimento: serialParaData(c.venc),
        testeGratis: c.teste ?? false,
        status: c.inativo ? "CANCELADO" : "ATIVO",
        anotacao: c.nota || null,
        criadoEm: c.inicio ? serialParaData(c.inicio) : undefined,
      },
    });
    clienteIdAntigoParaNovo.set(c.id, criado.id);
  }

  for (const m of modelos) {
    const produto = await prisma.produto.create({
      data: {
        revendedorId: revendedor.id,
        modelo: m.nome,
        estoqueMinimo: m.minimo,
      },
    });
    produtoIdAntigoParaNovo.set(m.id, produto.id);

    for (const e of m.entradas) {
      await prisma.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "ENTRADA",
          quantidade: e.qtd,
          custoUnitario: e.custo,
          data: parseData(e.data),
        },
      });
    }
  }

  let vendasImportadas = 0;
  for (const v of vendas) {
    const produtoId = v.modeloId ? produtoIdAntigoParaNovo.get(v.modeloId) : undefined;
    if (!produtoId) continue;
    await prisma.venda.create({
      data: {
        revendedorId: revendedor.id,
        produtoId,
        quantidade: v.qtd,
        valorUnitario: v.unit,
        formaPagamento: v.pagamento || "Pix",
        data: parseData(v.data),
      },
    });
    await prisma.movimentoEstoque.create({
      data: { produtoId, tipo: "SAIDA", quantidade: v.qtd, custoUnitario: 0, data: parseData(v.data) },
    });
    vendasImportadas += 1;
  }

  let renovacoesImportadas = 0;
  for (const r of recebimentos) {
    const clienteId = r.clienteId ? clienteIdAntigoParaNovo.get(r.clienteId) : undefined;
    if (!clienteId) continue;
    await prisma.renovacao.create({
      data: {
        clienteId,
        plano: mapearPlano(r.tipo),
        valor: r.valor,
        custo: r.custo,
        data: parseData(r.data),
      },
    });
    renovacoesImportadas += 1;
  }

  revalidatePath("/painel");
  revalidatePath("/clientes");
  revalidatePath("/estoque");
  revalidatePath("/vendas");
  revalidatePath("/relatorio");

  return {
    ok: true,
    resumo: `Importado: ${clientes.length} clientes, ${modelos.length} modelos de produto, ${vendasImportadas} vendas, ${renovacoesImportadas} renovações.`,
  };
}
