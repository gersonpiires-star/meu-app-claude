"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { registrarLog } from "@/lib/log";

export async function restaurarBackup(
  formData: FormData
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const revendedor = await exigirDono();
  const confirmacao = String(formData.get("confirmacao") ?? "");
  if (confirmacao !== "RESTAURAR") {
    return { ok: false, erro: 'Digite exatamente "RESTAURAR" para confirmar.' };
  }

  const campo = formData.get("json");
  if (!campo) return { ok: false, erro: "Selecione o arquivo de backup primeiro." };
  const texto = (typeof campo === "string" ? campo : await campo.text()).trim();
  if (!texto) return { ok: false, erro: "O arquivo selecionado está vazio." };

  let bruto: {
    dados?: {
      servicos?: Record<string, unknown>[];
      clientes?: Record<string, unknown>[];
      produtos?: Record<string, unknown>[];
      vendas?: Record<string, unknown>[];
      plataformas?: Record<string, unknown>[];
      chavesPix?: { tipo: string; valor: string }[];
      pagamentos?: Record<string, unknown>[];
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

  // Restaurar substitui tudo o que está no app agora. Tudo — os deletes e a
  // recriação inteira — roda numa única transação: se qualquer create no
  // meio do caminho falhar (registro inválido, conexão caiu), a transação
  // inteira desfaz e os dados originais continuam intactos, em vez de ficar
  // com metade do backup restaurado e a outra metade já apagada.
  await prisma.$transaction(
    async (tx) => {
      await tx.renovacao.deleteMany({ where: { cliente: { revendedorId } } });
      await tx.pagamento.deleteMany({ where: { revendedorId } });
      await tx.movimentoEstoque.deleteMany({ where: { produto: { revendedorId } } });
      await tx.venda.deleteMany({ where: { revendedorId } });
      await tx.cliente.deleteMany({ where: { revendedorId } });
      await tx.produto.deleteMany({ where: { revendedorId } });
      await tx.lotePlataforma.deleteMany({ where: { plataforma: { revendedorId } } });
      await tx.plataforma.deleteMany({ where: { revendedorId } });
      await tx.chavePix.deleteMany({ where: { revendedorId } });
      await tx.servico.deleteMany({ where: { revendedorId } });

      // Plataformas primeiro — serviços podem referenciar uma delas.
      const plataformaIdAntigoParaNovo = new Map<string, string>();
      for (const p of dados.plataformas ?? []) {
        const lotes = (p.lotes as Record<string, unknown>[] | undefined) ?? [];
        const criada = await tx.plataforma.create({
          data: { revendedorId, nome: p.nome as string, minimo: (p.minimo as number) ?? 0 },
        });
        plataformaIdAntigoParaNovo.set(p.id as string, criada.id);
        for (const l of lotes) {
          await tx.lotePlataforma.create({
            data: {
              plataformaId: criada.id,
              quantidade: l.quantidade as number,
              valorPago: l.valorPago as number,
              data: l.data ? new Date(l.data as string) : new Date(),
            },
          });
        }
      }

      const servicoIdAntigoParaNovo = new Map<string, string>();
      for (const s of dados.servicos ?? []) {
        const plataformaIdAntigo = s.plataformaId as string | null | undefined;
        const criado = await tx.servico.create({
          data: {
            revendedorId,
            nome: s.nome as string,
            custoCredito: (s.custoCredito as number) ?? null,
            cobrancaTelaExtra: (s.cobrancaTelaExtra as number) ?? null,
            plataformaId: plataformaIdAntigo ? plataformaIdAntigoParaNovo.get(plataformaIdAntigo) ?? null : null,
          },
        });
        servicoIdAntigoParaNovo.set(s.id as string, criado.id);
      }

      const produtoIdAntigoParaNovo = new Map<string, string>();
      for (const p of dados.produtos ?? []) {
        const movimentos = (p.movimentos as Record<string, unknown>[] | undefined) ?? [];
        const criado = await tx.produto.create({
          data: {
            revendedorId,
            modelo: p.modelo as string,
            estoqueMinimo: (p.estoqueMinimo as number) ?? 0,
          },
        });
        produtoIdAntigoParaNovo.set(p.id as string, criado.id);
        for (const m of movimentos) {
          await tx.movimentoEstoque.create({
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

      const clienteIdAntigoParaNovo = new Map<string, string>();
      for (const c of dados.clientes ?? []) {
        const renovacoes = (c.renovacoes as Record<string, unknown>[] | undefined) ?? [];
        const servicoIdAntigo = c.servicoId as string | null;
        const criado = await tx.cliente.create({
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
            criadoEm: c.criadoEm ? new Date(c.criadoEm as string) : new Date(),
          },
        });
        clienteIdAntigoParaNovo.set(c.id as string, criado.id);
        for (const r of renovacoes) {
          await tx.renovacao.create({
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

      // Segunda passada pra "indicado por": o cliente que indicou pode
      // aparecer depois do indicado no arquivo, então o id novo dele só
      // existe depois que todo mundo já foi criado.
      for (const c of dados.clientes ?? []) {
        const indicadoPorIdAntigo = c.indicadoPorId as string | null | undefined;
        if (!indicadoPorIdAntigo) continue;
        const clienteId = clienteIdAntigoParaNovo.get(c.id as string);
        const indicadoPorId = clienteIdAntigoParaNovo.get(indicadoPorIdAntigo);
        if (clienteId && indicadoPorId) {
          await tx.cliente.update({ where: { id: clienteId }, data: { indicadoPorId } });
        }
      }

      for (const v of dados.vendas ?? []) {
        const produtoId = produtoIdAntigoParaNovo.get(v.produtoId as string);
        if (!produtoId) continue;
        const clienteIdAntigo = v.clienteId as string | null | undefined;
        await tx.venda.create({
          data: {
            revendedorId,
            produtoId,
            clienteId: clienteIdAntigo ? clienteIdAntigoParaNovo.get(clienteIdAntigo) ?? null : null,
            quantidade: v.quantidade as number,
            valorUnitario: v.valorUnitario as number,
            // Backups de antes desse campo existir não têm custoUnitario —
            // cai pra 0 (mesmo tratamento já dado a outros campos novos).
            custoUnitario: (v.custoUnitario as number) ?? 0,
            formaPagamento: (v.formaPagamento as string) ?? "Pix",
            taxaPercentual: (v.taxaPercentual as number) ?? 0,
            data: v.data ? new Date(v.data as string) : new Date(),
          },
        });
      }

      for (const chave of dados.chavesPix ?? []) {
        await tx.chavePix.create({ data: { revendedorId, tipo: chave.tipo, valor: chave.valor } });
      }

      // Backups antigos (versão 1) não têm pagamentos — ?? [] restaura o
      // resto normalmente, só sem o histórico de cobrança online.
      for (const p of dados.pagamentos ?? []) {
        const clienteIdAntigo = p.clienteId as string | null | undefined;
        await tx.pagamento.create({
          data: {
            revendedorId,
            clienteId: clienteIdAntigo ? clienteIdAntigoParaNovo.get(clienteIdAntigo) ?? null : null,
            tipo: p.tipo as "ASSINATURA" | "RENOVACAO",
            status: p.status as "PENDENTE" | "APROVADO" | "RECUSADO" | "CANCELADO",
            plano: (p.plano as "MENSAL" | "DOIS_MESES" | "TRIMESTRAL" | "SEMESTRAL") ?? null,
            valor: p.valor as number,
            custo: (p.custo as number) ?? 0,
            meses: (p.meses as number) ?? null,
            // mpPreferenceId/mpPaymentId têm restrição de unicidade — não
            // restauramos pra não colidir com um pagamento novo que já use
            // o mesmo id numa conta que reimporta o mesmo backup duas vezes.
            criadoEm: p.criadoEm ? new Date(p.criadoEm as string) : new Date(),
            atualizadoEm: p.atualizadoEm ? new Date(p.atualizadoEm as string) : new Date(),
          },
        });
      }
    },
    { timeout: 120000 }
  );

  await registrarLog(
    revendedorId,
    "backup.restaurar",
    `Restaurou um backup — substituiu todos os dados (${dados.clientes?.length ?? 0} clientes)`
  );

  revalidatePath("/painel");
  revalidatePath("/clientes");
  revalidatePath("/estoque");
  revalidatePath("/vendas");
  revalidatePath("/plataformas");
  revalidatePath("/configuracoes");

  return { ok: true };
}
