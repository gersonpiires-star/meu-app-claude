"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

export async function restaurarBackup(
  formData: FormData
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const revendedor = await exigirRevendedor();
  const confirmacao = String(formData.get("confirmacao") ?? "");
  if (confirmacao !== "RESTAURAR") {
    return { ok: false, erro: 'Digite exatamente "RESTAURAR" para confirmar.' };
  }

  const texto = String(formData.get("json") ?? "").trim();
  if (!texto) return { ok: false, erro: "Cole o conteúdo do backup primeiro." };

  let bruto: {
    dados?: {
      servicos?: { id: string; nome: string }[];
      clientes?: Record<string, unknown>[];
      produtos?: Record<string, unknown>[];
      vendas?: Record<string, unknown>[];
      plataformas?: Record<string, unknown>[];
      chavesPix?: { tipo: string; valor: string }[];
    };
  };
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erro: "Esse texto não é um JSON válido." };
  }

  const dados = bruto.dados;
  if (!dados) return { ok: false, erro: "Esse arquivo não parece um backup do GestorPro." };

  const revendedorId = revendedor.id;

  // Restaurar substitui tudo o que está no app agora.
  await prisma.$transaction([
    prisma.renovacao.deleteMany({ where: { cliente: { revendedorId } } }),
    prisma.pagamento.deleteMany({ where: { revendedorId } }),
    prisma.movimentoEstoque.deleteMany({ where: { produto: { revendedorId } } }),
    prisma.venda.deleteMany({ where: { revendedorId } }),
    prisma.cliente.deleteMany({ where: { revendedorId } }),
    prisma.produto.deleteMany({ where: { revendedorId } }),
    prisma.lotePlataforma.deleteMany({ where: { plataforma: { revendedorId } } }),
    prisma.plataforma.deleteMany({ where: { revendedorId } }),
    prisma.chavePix.deleteMany({ where: { revendedorId } }),
    prisma.servico.deleteMany({ where: { revendedorId } }),
  ]);

  const servicoIdAntigoParaNovo = new Map<string, string>();
  for (const s of dados.servicos ?? []) {
    const criado = await prisma.servico.create({ data: { revendedorId, nome: s.nome } });
    servicoIdAntigoParaNovo.set(s.id, criado.id);
  }

  const produtoIdAntigoParaNovo = new Map<string, string>();
  for (const p of dados.produtos ?? []) {
    const movimentos = (p.movimentos as Record<string, unknown>[] | undefined) ?? [];
    const criado = await prisma.produto.create({
      data: {
        revendedorId,
        modelo: p.modelo as string,
        estoqueMinimo: (p.estoqueMinimo as number) ?? 0,
      },
    });
    produtoIdAntigoParaNovo.set(p.id as string, criado.id);
    for (const m of movimentos) {
      await prisma.movimentoEstoque.create({
        data: {
          produtoId: criado.id,
          tipo: m.tipo as "ENTRADA" | "SAIDA",
          quantidade: m.quantidade as number,
          custoUnitario: m.custoUnitario as number,
          data: m.data ? new Date(m.data as string) : new Date(),
        },
      });
    }
  }

  for (const c of dados.clientes ?? []) {
    const renovacoes = (c.renovacoes as Record<string, unknown>[] | undefined) ?? [];
    const servicoIdAntigo = c.servicoId as string | null;
    const criado = await prisma.cliente.create({
      data: {
        revendedorId,
        servicoId: servicoIdAntigo ? servicoIdAntigoParaNovo.get(servicoIdAntigo) ?? null : null,
        nome: c.nome as string,
        cpf: (c.cpf as string) ?? null,
        whatsapp: (c.whatsapp as string) ?? null,
        telas: (c.telas as number) ?? 1,
        plano: c.plano as "MENSAL" | "DOIS_MESES" | "TRIMESTRAL" | "SEMESTRAL",
        valorPlano: c.valorPlano as number,
        diaFixo: (c.diaFixo as number) ?? null,
        vencimento: new Date(c.vencimento as string),
        testeGratis: (c.testeGratis as boolean) ?? false,
        status: (c.status as "TESTE" | "ATIVO" | "VENCIDO" | "CANCELADO") ?? "ATIVO",
        anotacao: (c.anotacao as string) ?? null,
        motivoSaida: (c.motivoSaida as string) ?? null,
        motivoSaidaData: c.motivoSaidaData ? new Date(c.motivoSaidaData as string) : null,
      },
    });
    for (const r of renovacoes) {
      await prisma.renovacao.create({
        data: {
          clienteId: criado.id,
          plano: r.plano as "MENSAL" | "DOIS_MESES" | "TRIMESTRAL" | "SEMESTRAL",
          valor: r.valor as number,
          custo: (r.custo as number) ?? 0,
          data: r.data ? new Date(r.data as string) : new Date(),
        },
      });
    }
  }

  for (const v of dados.vendas ?? []) {
    const produtoId = produtoIdAntigoParaNovo.get(v.produtoId as string);
    if (!produtoId) continue;
    await prisma.venda.create({
      data: {
        revendedorId,
        produtoId,
        quantidade: v.quantidade as number,
        valorUnitario: v.valorUnitario as number,
        formaPagamento: (v.formaPagamento as string) ?? "Pix",
        taxaPercentual: (v.taxaPercentual as number) ?? 0,
        data: v.data ? new Date(v.data as string) : new Date(),
      },
    });
  }

  for (const p of dados.plataformas ?? []) {
    const lotes = (p.lotes as Record<string, unknown>[] | undefined) ?? [];
    const criada = await prisma.plataforma.create({
      data: { revendedorId, nome: p.nome as string, minimo: (p.minimo as number) ?? 0 },
    });
    for (const l of lotes) {
      await prisma.lotePlataforma.create({
        data: {
          plataformaId: criada.id,
          quantidade: l.quantidade as number,
          valorPago: l.valorPago as number,
          data: l.data ? new Date(l.data as string) : new Date(),
        },
      });
    }
  }

  for (const chave of dados.chavesPix ?? []) {
    await prisma.chavePix.create({ data: { revendedorId, tipo: chave.tipo, valor: chave.valor } });
  }

  revalidatePath("/painel");
  revalidatePath("/clientes");
  revalidatePath("/estoque");
  revalidatePath("/vendas");
  revalidatePath("/plataformas");
  revalidatePath("/configuracoes");

  return { ok: true };
}
