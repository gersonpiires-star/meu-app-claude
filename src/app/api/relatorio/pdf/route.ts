import { NextRequest, NextResponse } from "next/server";
import { exigirRevendedor } from "@/lib/sessao";
import { visaoGeralPeriodo, oQueMaisVendeNoPeriodo } from "@/lib/relatorio";
import { gerarRelatorioPdf } from "@/lib/relatorio-pdf";

const PERIODOS: Record<string, { label: string; meses: number }> = {
  "30": { label: "30 dias", meses: 1 },
  "6m": { label: "6 meses", meses: 6 },
  "12m": { label: "12 meses", meses: 12 },
};

export async function GET(req: NextRequest) {
  const revendedor = await exigirRevendedor();
  const periodoChave = req.nextUrl.searchParams.get("periodo") ?? "6m";
  const periodo = PERIODOS[periodoChave] ?? PERIODOS["6m"];

  const [visaoGeral, maisVendidos] = await Promise.all([
    visaoGeralPeriodo(revendedor.id, periodo.meses),
    oQueMaisVendeNoPeriodo(revendedor.id, periodo.meses),
  ]);

  const bytes = await gerarRelatorioPdf({
    emitente: { nome: revendedor.nome },
    periodoLabel: periodo.label,
    stats: {
      receita: visaoGeral.receita,
      lucro: visaoGeral.lucro,
      margem: visaoGeral.margem,
      clientesNovos: visaoGeral.clientesNovos,
      naoRenovaram: visaoGeral.naoRenovaram,
      taxaPerdaPct: visaoGeral.taxaPerdaPct,
      retencaoPct: visaoGeral.retencaoPct,
      emDia: visaoGeral.emDia,
      vencendo: visaoGeral.vencendo,
      vencidos: visaoGeral.vencidos,
    },
    maisVendidos,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${periodoChave}.pdf"`,
    },
  });
}
