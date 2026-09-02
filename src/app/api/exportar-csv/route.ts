import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { PLANO_LABEL } from "@/lib/planos";
import { dataCurta } from "@/lib/format";

function csvEscape(valor: string): string {
  if (/[",\n;]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export async function GET() {
  const revendedor = await exigirRevendedor();
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
      dataCurta(c.vencimento) + "/" + c.vencimento.getFullYear(),
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
