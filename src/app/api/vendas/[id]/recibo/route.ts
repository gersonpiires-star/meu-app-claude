import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";
import { brl, dataPorExtenso } from "@/lib/format";
import { gerarReciboPdf } from "@/lib/recibo-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const revendedor = await exigirRevendedor();
  const { id } = await params;

  const venda = await prisma.venda.findUnique({
    where: { id },
    include: { produto: true, cliente: true },
  });
  if (!venda || venda.revendedorId !== revendedor.id) {
    return NextResponse.json({ erro: "Recibo não encontrado." }, { status: 404 });
  }
  if (!venda.cliente) {
    return NextResponse.json({ erro: "Essa venda não tem cliente associado — não dá pra emitir recibo." }, { status: 400 });
  }

  const bruto = venda.quantidade * venda.valorUnitario;

  const bytes = await gerarReciboPdf({
    emitente: { nome: revendedor.nome, whatsapp: revendedor.whatsapp },
    subtitulo: "Comprovante de venda de aparelho",
    campos: [
      { rotulo: "Cliente", valor: venda.cliente.nome },
      { rotulo: "Aparelho", valor: venda.produto.modelo },
      { rotulo: "Quantidade", valor: `${venda.quantidade} un. × ${brl(venda.valorUnitario)}` },
      { rotulo: "Forma de pagamento", valor: venda.formaPagamento },
      { rotulo: "Vendido em", valor: dataPorExtenso(venda.data) },
    ],
    destaqueRotulo: "Valor da venda",
    destaqueValor: brl(bruto),
    reciboId: id,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${venda.cliente.nome.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
    },
  });
}
