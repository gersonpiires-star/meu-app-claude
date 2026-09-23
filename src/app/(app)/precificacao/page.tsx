import { exigirRevendedor, permissoesFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { custoMedioProdutos } from "@/lib/dados";
import { IconEtiqueta } from "@/components/nav-icons";
import { ComboCalc } from "./combo-calc";
import { MaquininhaCalc } from "./maquininha-calc";

export default async function PrecificacaoPage() {
  const revendedor = await exigirRevendedor();
  const { podeVerFinanceiro } = await permissoesFuncionario();
  const taxasSalvas = (revendedor.taxasCartaoPersonalizadas as Record<string, number> | null) ?? {};
  const taxasIniciais = Object.fromEntries(Object.entries(taxasSalvas).map(([k, v]) => [Number(k), v]));

  const [produtos, custos] = await Promise.all([
    prisma.produto.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: { modelo: "asc" },
      select: { id: true, modelo: true },
    }),
    custoMedioProdutos(revendedor.id),
  ]);
  const produtosComCusto = produtos.map((p) => ({ ...p, custoProximoLote: custos.get(p.id)?.proximoCusto ?? 0 }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <IconEtiqueta className="h-4 w-4" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-text">Precificação</h1>
          <p className="text-xs text-text-dim">Descubra o preço certo pra ter o lucro que você quer — os cálculos mudam na hora</p>
        </div>
      </div>

      <ComboCalc margemInicial={revendedor.margemPadrao} produtos={produtosComCusto} />

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <div>
          <h2 className="text-base font-bold text-text">Parcelamento de aparelho na maquininha</h2>
          <p className="text-xs text-text-dim">Simula o preço à vista e as taxas reais de parcelamento da sua maquininha, pra vendas avulsas de aparelho</p>
        </div>
        <MaquininhaCalc margemInicial={revendedor.margemPadrao} taxasIniciais={taxasIniciais} podeEditar={podeVerFinanceiro} />
      </div>
    </div>
  );
}
