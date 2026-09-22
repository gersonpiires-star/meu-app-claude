import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/sessao";
import { dataCurta } from "@/lib/format";
import { planoDosMeses } from "@/lib/planos-assinatura";

const PLANO_LABEL: Record<string, string> = { MENSAL: "Mensal", SEMESTRAL: "Semestral", ANUAL: "Anual" };

function csvEscape(valor: string): string {
  if (/[",\n;]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

// Exporta a base inteira de revendedores (assinantes, trial, pausados,
// cancelados) pro admin analisar fora do app — CPF/valores/status de
// pagamento não têm lugar equivalente pra visualização em massa dentro do
// próprio painel admin (só a lista paginada em tela).
export async function GET() {
  await exigirAdmin();

  const revendedores = await prisma.revendedor.findMany({
    where: { papel: "REVENDEDOR" },
    orderBy: { criadoEm: "desc" },
    include: {
      indicadoPor: { select: { nome: true } },
      pagamentos: {
        where: { tipo: "ASSINATURA", status: "APROVADO" },
        orderBy: { criadoEm: "desc" },
        take: 1,
        select: { valor: true, meses: true },
      },
    },
  });

  const cabecalho = [
    "Nome",
    "E-mail",
    "WhatsApp",
    "CPF",
    "Status",
    "Plano",
    "Valor último pagamento",
    "Vencimento/Trial até",
    "Criado em",
    "Último acesso",
    "Indicado por",
  ];

  const linhas = revendedores.map((r) => {
    const ultimoPagamento = r.pagamentos[0];
    const plano =
      r.planoAssinatura ?? (ultimoPagamento ? planoDosMeses(ultimoPagamento.meses ?? 1) : r.statusAssinatura === "TRIAL" ? "TRIAL" : null);
    const vencimento = r.statusAssinatura === "TRIAL" ? r.trialFim : r.assinaturaVence;

    return [
      r.nome,
      r.email,
      r.whatsapp,
      r.cpf ?? "",
      r.statusAssinatura,
      plano === "TRIAL" ? "Trial" : plano ? PLANO_LABEL[plano] : "",
      ultimoPagamento ? ultimoPagamento.valor.toFixed(2).replace(".", ",") : "",
      vencimento ? dataCurta(vencimento) : "",
      dataCurta(r.criadoEm),
      r.ultimoAcessoEm ? dataCurta(r.ultimoAcessoEm) : "nunca",
      r.indicadoPor?.nome ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";");
  });

  const csv = "﻿" + [cabecalho.join(";"), ...linhas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gestorpro-assinantes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
