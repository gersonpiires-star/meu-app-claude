import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl, dataHora } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { NovoCupomForm } from "./novo-cupom-form";
import { AlternarAtivoBotao } from "./alternar-ativo-botao";

export default async function CupomsPage() {
  await exigirAdmin();
  const [cupons, revendedores] = await Promise.all([
    prisma.cupom.findMany({
      include: { revendedor: { select: { nome: true, email: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Cupons de desconto</h1>
          <p className="text-xs text-text-dim">Pra campanhas de venda da assinatura do GestorPro.</p>
        </div>
        <NovoCupomForm revendedores={revendedores} />
      </div>

      {cupons.length === 0 ? (
        <EmptyState>Nenhum cupom criado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {cupons.map((c) => {
            const expirado = c.validoAte ? c.validoAte < new Date() : false;
            const esgotado = c.usoMaximo != null && c.usosCount >= c.usoMaximo;
            const efetivamenteAtivo = c.ativo && !expirado && !esgotado;
            return (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-text">{c.codigo}</span>
                    {efetivamenteAtivo ? (
                      <Badge tone="accent">Ativo</Badge>
                    ) : (
                      <Badge tone="neutral">{!c.ativo ? "Desativado" : expirado ? "Expirado" : "Esgotado"}</Badge>
                    )}
                    {c.revendedor ? <Badge tone="warning">Restrito a {c.revendedor.nome}</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-text-dim">
                    {c.tipo === "PERCENTUAL" ? `${c.valor}% de desconto` : `${brl(c.valor)} de desconto`}
                    {c.validoAte ? ` · válido até ${dataHora(c.validoAte)}` : ""}
                    {c.usoMaximo != null ? ` · ${c.usosCount}/${c.usoMaximo} usos` : ` · ${c.usosCount} uso${c.usosCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                <AlternarAtivoBotao id={c.id} ativo={c.ativo} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
