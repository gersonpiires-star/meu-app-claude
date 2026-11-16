import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirDono } from "@/lib/sessao";
import { PLANO_LABEL } from "@/lib/planos";
import { dataCurta, diaCivilBr } from "@/lib/format";

// Protege contra CSV/Formula Injection: uma célula que comece com =+-@ pode
// ser interpretada como fórmula pelo Excel/Sheets ao abrir o arquivo (ex: um
// nome de cliente digitado como =HYPERLINK(...) executando algo só de abrir
// a planilha) — prefixar com apóstrofo neutraliza sem mudar o valor visível.
function csvEscape(valor: string): string {
  const protegido = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
  if (/[",\n;]/.test(protegido)) return `"${protegido.replace(/"/g, '""')}"`;
  return protegido;
}

export async function GET() {
  // Exporta a lista completa de clientes (nome, CPF, WhatsApp, valores) —
  // só o dono da conta pode baixar isso, não um funcionário.
  const revendedor = await exigirDono();
  const clientes = await prisma.cliente.findMany({
    where: { revendedorId: revendedor.id },
    include: { servico: true },
    orderBy: { nome: "asc" },
  });

  const cabecalho = ["Nome", "WhatsApp", "CPF", "Serviço", "Plano", "Valor", "Vencimento", "Status", "Anotação"];
  const linhas = clientes.map((c) =>
    [
      c.nome,
      c.whatsapp ?? "",
      c.cpf ?? "",
      c.servico?.nome ?? "",
      PLANO_LABEL[c.plano],
      c.valorPlano.toFixed(2).replace(".", ","),
      dataCurta(c.vencimento) + "/" + diaCivilBr(c.vencimento).ano,
      c.status,
      c.anotacao ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );

  const csv = "﻿" + [cabecalho.join(";"), ...linhas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gestorpro-clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
