"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor, souFuncionario } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";
import { dataHora } from "@/lib/format";
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

const loteAntigoSchema = z.object({
  qtd: z.number(),
  valor: z.number(),
  data: z.string().optional(),
});

const plataformaAntigaSchema = z.object({
  id: z.number(),
  nome: z.string(),
  minimo: z.number().optional().default(3),
  lotes: z.array(loteAntigoSchema).optional().default([]),
});

const appAntigoSchema = z.object({
  id: z.number(),
  nome: z.string(),
  credito: z.number().optional(),
  valorTela: z.number().optional(),
  plataformaId: z.number().nullable().optional(),
});

const importSchema = z.object({
  dados: z.object({
    clientes: z.array(clienteAntigoSchema).optional().default([]),
    modelos: z.array(modeloAntigoSchema).optional().default([]),
    vendas: z.array(vendaAntigaSchema).optional().default([]),
    recebimentos: z.array(recebimentoAntigoSchema).optional().default([]),
    plataformas: z.array(plataformaAntigaSchema).optional().default([]),
    apps: z.array(appAntigoSchema).optional().default([]),
  }),
});

// Meia-noite de Brasília do dia informado, como instante UTC — evita que a
// data importada apareça um dia antes ao ser exibida (o app formata tudo no
// fuso de Brasília, mas o servidor roda em UTC).
function meiaNoiteBr(dia: number, mes: number, ano: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0));
}

function parseData(texto?: string): Date {
  if (!texto) return new Date();

  if (texto.includes("/")) {
    const [dia, mes, ano] = texto.split("/").map(Number);
    if (dia && mes && ano) return meiaNoiteBr(dia, mes, ano);
  }

  if (texto.includes("-")) {
    const [ano, mes, dia] = texto.split("-").map(Number);
    if (dia && mes && ano) return meiaNoiteBr(dia, mes, ano);
  }

  return new Date();
}

export async function importarDadosAntigos(
  formData: FormData
): Promise<{ ok: true; resumo: string } | { ok: false; erro: string }> {
  const revendedor = await exigirRevendedor();
  const campo = formData.get("json");
  if (!campo) return { ok: false, erro: "Selecione o arquivo de backup primeiro." };
  const texto = (typeof campo === "string" ? campo : await campo.text()).trim();
  if (!texto) return { ok: false, erro: "O arquivo selecionado está vazio." };

  const zerarAntes = formData.get("zerarAntes") === "on";
  if (zerarAntes) {
    if (await souFuncionario()) {
      return { ok: false, erro: "Só o dono da conta pode apagar os dados atuais." };
    }
    const confirmacaoZerar = String(formData.get("confirmacaoZerar") ?? "");
    if (confirmacaoZerar !== "ZERAR") {
      return { ok: false, erro: 'Digite exatamente "ZERAR" para confirmar que quer apagar os dados atuais.' };
    }
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse texto não é um JSON válido." };
  }

  const parsed = importSchema.safeParse(bruto);
  if (!parsed.success) {
    console.error("importarDadosAntigos: JSON fora do formato esperado", parsed.error.issues);
    return { ok: false, erro: "O JSON não tem o formato esperado do backup do app antigo." };
  }
  const { clientes, modelos, vendas, recebimentos, plataformas, apps } = parsed.data.dados;

  // Reimportar o mesmo arquivo (ex: clicar de novo achando que não funcionou
  // da primeira vez) duplicava clientes, vendas, movimentos e renovações —
  // esse hash do conteúdo bloqueia a repetição.
  const hash = createHash("sha256").update(texto).digest("hex");
  const jaImportado = await prisma.importacaoAntiga.findUnique({
    where: { revendedorId_hash: { revendedorId: revendedor.id, hash } },
  });
  if (jaImportado) {
    return {
      ok: false,
      erro: `Esse mesmo arquivo já foi importado em ${dataHora(jaImportado.criadoEm)} — pra evitar duplicar clientes e vendas, essa importação foi bloqueada. Se algo não apareceu, confira em Clientes/Vendas antes de tentar de novo com outro arquivo.`,
    };
  }

  try {
    const resultado = await importar({ revendedorId: revendedor.id, clientes, modelos, vendas, recebimentos, plataformas, apps, zerarAntes });
    if (resultado.ok) {
      await prisma.importacaoAntiga.create({
        data: { revendedorId: revendedor.id, hash, resumo: resultado.resumo },
      });
      if (zerarAntes) {
        await registrarLog(revendedor.id, "dados.zerar_importar", `Apagou todos os dados atuais e importou o arquivo antigo — ${resultado.resumo}`);
      }
    }
    return resultado;
  } catch (erro) {
    console.error("importarDadosAntigos: falha ao importar", erro);
    return { ok: false, erro: "Algo deu errado ao importar esse arquivo. Confira se ele é mesmo um backup do app antigo e tente de novo." };
  }
}

async function importar({
  revendedorId,
  clientes,
  modelos,
  vendas,
  recebimentos,
  plataformas,
  apps,
  zerarAntes,
}: {
  revendedorId: string;
  clientes: z.infer<typeof clienteAntigoSchema>[];
  modelos: z.infer<typeof modeloAntigoSchema>[];
  vendas: z.infer<typeof vendaAntigaSchema>[];
  recebimentos: z.infer<typeof recebimentoAntigoSchema>[];
  plataformas: z.infer<typeof plataformaAntigaSchema>[];
  apps: z.infer<typeof appAntigoSchema>[];
  zerarAntes: boolean;
}): Promise<{ ok: true; resumo: string } | { ok: false; erro: string }> {
  // Tudo roda numa única transação — se algo no meio do caminho falhar (ex:
  // um produto com nome repetido, que colide com a restrição de unicidade),
  // desfaz tudo em vez de deixar clientes/produtos já criados órfãos e só
  // reportar erro no fim, como acontecia antes.
  const resumo = await prisma.$transaction(
    async (tx) => {
      // Zerar acontece na mesma transação da importação: se algo abaixo
      // falhar, os deletes também desfazem — nunca fica com a conta vazia e
      // a importação pela metade.
      if (zerarAntes) {
        await tx.renovacao.deleteMany({ where: { cliente: { revendedorId } } });
        await tx.movimentoEstoque.deleteMany({ where: { produto: { revendedorId } } });
        await tx.venda.deleteMany({ where: { revendedorId } });
        await tx.cliente.deleteMany({ where: { revendedorId } });
        await tx.produto.deleteMany({ where: { revendedorId } });
        await tx.lotePlataforma.deleteMany({ where: { plataforma: { revendedorId } } });
        await tx.plataforma.deleteMany({ where: { revendedorId } });
        await tx.chavePix.deleteMany({ where: { revendedorId } });
        await tx.servico.deleteMany({ where: { revendedorId } });
      }

      const servicoIdPorNome = new Map<string, string>();
      const clienteIdAntigoParaNovo = new Map<number, string>();
      const produtoIdAntigoParaNovo = new Map<number, string>();
      const plataformaIdAntigaParaNova = new Map<number, string>();

      // Plataformas e serviços costumam ser poucos (dezenas, não milhares) e
      // precisam de upsert pra deduplicar por nome — mantidos sequenciais.
      for (const p of plataformas) {
        const criada = await tx.plataforma.upsert({
          where: { revendedorId_nome: { revendedorId, nome: p.nome } },
          update: { minimo: p.minimo },
          create: { revendedorId, nome: p.nome, minimo: p.minimo },
        });
        plataformaIdAntigaParaNova.set(p.id, criada.id);
      }
      const lotesData = plataformas.flatMap((p) =>
        p.lotes.map((l) => ({
          plataformaId: plataformaIdAntigaParaNova.get(p.id)!,
          quantidade: l.qtd,
          valorPago: l.valor,
          data: parseData(l.data),
        }))
      );
      if (lotesData.length > 0) await tx.lotePlataforma.createMany({ data: lotesData });

      const nomesServicos = new Set<string>([
        ...clientes.map((c) => c.app).filter((v): v is string => Boolean(v)),
        ...apps.map((a) => a.nome),
      ]);

      for (const nome of nomesServicos) {
        const appAntigo = apps.find((a) => a.nome === nome);
        const plataformaId =
          appAntigo?.plataformaId != null ? plataformaIdAntigaParaNova.get(appAntigo.plataformaId) ?? null : undefined;

        const servico = await tx.servico.upsert({
          where: { revendedorId_nome: { revendedorId, nome } },
          update: {
            custoCredito: appAntigo?.credito ?? undefined,
            cobrancaTelaExtra: appAntigo?.valorTela ?? undefined,
            plataformaId,
          },
          create: {
            revendedorId,
            nome,
            custoCredito: appAntigo?.credito ?? null,
            cobrancaTelaExtra: appAntigo?.valorTela ?? null,
            plataformaId: plataformaId ?? null,
          },
        });
        servicoIdPorNome.set(nome, servico.id);
      }

      // Clientes, produtos, vendas, movimentos e renovações podem chegar aos
      // milhares num backup real — gerar os ids aqui e gravar em lote evita
      // centenas de idas e vindas ao banco (e o timeout que isso causava).
      const clientesData = clientes.map((c) => {
        const id = randomUUID();
        clienteIdAntigoParaNovo.set(c.id, id);
        return {
          id,
          revendedorId,
          servicoId: c.app ? servicoIdPorNome.get(c.app) ?? null : null,
          nome: c.nome,
          whatsapp: normalizarWhatsapp(c.tel),
          telas: c.telas ?? 1,
          plano: mapearPlano(c.plano),
          valorPlano: c.valor ?? 0,
          vencimento: serialParaData(c.venc),
          testeGratis: c.teste ?? false,
          status: c.inativo ? ("CANCELADO" as const) : ("ATIVO" as const),
          anotacao: c.nota || null,
          criadoEm: c.inicio ? serialParaData(c.inicio) : undefined,
        };
      });
      if (clientesData.length > 0) await tx.cliente.createMany({ data: clientesData });

      const produtosData = modelos.map((m) => {
        const id = randomUUID();
        produtoIdAntigoParaNovo.set(m.id, id);
        return { id, revendedorId, modelo: m.nome, estoqueMinimo: m.minimo };
      });
      if (produtosData.length > 0) await tx.produto.createMany({ data: produtosData });

      const entradasData = modelos.flatMap((m) =>
        m.entradas.map((e) => ({
          produtoId: produtoIdAntigoParaNovo.get(m.id)!,
          tipo: "ENTRADA" as const,
          quantidade: e.qtd,
          custoUnitario: e.custo,
          data: parseData(e.data),
        }))
      );
      if (entradasData.length > 0) await tx.movimentoEstoque.createMany({ data: entradasData });

      const vendasValidas = vendas.filter((v) => v.modeloId != null && produtoIdAntigoParaNovo.has(v.modeloId));
      const vendasData = vendasValidas.map((v) => ({
        revendedorId,
        produtoId: produtoIdAntigoParaNovo.get(v.modeloId!)!,
        quantidade: v.qtd,
        valorUnitario: v.unit,
        formaPagamento: v.pagamento || "Pix",
        data: parseData(v.data),
      }));
      if (vendasData.length > 0) await tx.venda.createMany({ data: vendasData });
      if (vendasValidas.length > 0) {
        await tx.movimentoEstoque.createMany({
          data: vendasValidas.map((v) => ({
            produtoId: produtoIdAntigoParaNovo.get(v.modeloId!)!,
            tipo: "SAIDA" as const,
            quantidade: v.qtd,
            custoUnitario: 0,
            data: parseData(v.data),
          })),
        });
      }
      const vendasImportadas = vendasValidas.length;

      const recebimentosValidos = recebimentos.filter(
        (r) => r.clienteId != null && clienteIdAntigoParaNovo.has(r.clienteId)
      );
      const renovacoesData = recebimentosValidos.map((r) => ({
        clienteId: clienteIdAntigoParaNovo.get(r.clienteId!)!,
        plano: mapearPlano(r.tipo),
        valor: r.valor,
        custo: r.custo,
        data: parseData(r.data),
      }));
      if (renovacoesData.length > 0) await tx.renovacao.createMany({ data: renovacoesData });
      const renovacoesImportadas = renovacoesData.length;

      return `Importado: ${clientes.length} clientes, ${nomesServicos.size} apps (com preço/plataforma), ${plataformas.length} plataformas, ${modelos.length} modelos de produto, ${vendasImportadas} vendas, ${renovacoesImportadas} renovações.`;
    },
    { timeout: 120000 }
  );

  revalidatePath("/painel");
  revalidatePath("/clientes");
  revalidatePath("/estoque");
  revalidatePath("/vendas");
  revalidatePath("/relatorio");
  revalidatePath("/plataformas");
  revalidatePath("/precificacao");

  return { ok: true, resumo };
}
