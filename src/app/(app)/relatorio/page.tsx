import { exigirRevendedor } from "@/lib/sessao";
import { dadosMes, proximoMes, ultimosMeses } from "@/lib/relatorio";
import { brl } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { GraficoMeses } from "./grafico-meses";

const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const agora = new Date();
  const { ano: anoParam, mes: mesParam } = await searchParams;
  const ano = anoParam ? Number(anoParam) : agora.getFullYear();
  const mes = mesParam ? Number(mesParam) : agora.getMonth();

  const [meses, dados, futuro] = await Promise.all([
    ultimosMeses(revendedor.id),
    dadosMes(revendedor.id, ano, mes),
    proximoMes(revendedor.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">
        Relatório · {MESES_NOME[mes]} de {ano}
      </h1>

      <Card>
        <GraficoMeses meses={meses} selecionado={{ ano, mes }} />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Custos</span>
          <span className="text-xl font-bold text-danger">− {brl(dados.custo)}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Lucro do mês</span>
          <span className="text-xl font-bold text-accent">{brl(dados.lucro)}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Margem</span>
          <span className="text-xl font-bold text-text">{dados.margem.toFixed(0)}%</span>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">De onde vem o custo</h2>
        <div className="flex flex-col divide-y divide-border text-sm">
          <div className="flex items-center justify-between py-2">
            <span className="text-text-muted">Créditos de serviço</span>
            <span className="font-semibold text-danger">− {brl(dados.custoRenov)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-text-muted">Produtos vendidos</span>
            <span className="font-semibold text-danger">− {brl(dados.custoVendas)}</span>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Renovações do mês · por serviço</h2>
        {dados.porServico.length === 0 ? (
          <p className="text-sm text-text-dim">Nenhuma renovação registrada neste mês</p>
        ) : (
          <div className="flex flex-col divide-y divide-border text-sm">
            {dados.porServico.map(([nome, valor]) => (
              <div key={nome} className="flex items-center justify-between py-2">
                <span className="text-text-muted">{nome}</span>
                <span className="font-semibold text-accent">{brl(valor)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Vendas do mês · líquido por produto</h2>
        {dados.porProduto.length === 0 ? (
          <p className="text-sm text-text-dim">Nenhum produto vendido neste mês</p>
        ) : (
          <div className="flex flex-col divide-y divide-border text-sm">
            {dados.porProduto.map(([nome, valor]) => (
              <div key={nome} className="flex items-center justify-between py-2">
                <span className="text-text-muted">{nome}</span>
                <span className="font-semibold text-accent">{brl(valor)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Quem fica e quem sai</h2>
        {dados.cancelados.length === 0 ? (
          <p className="text-sm text-text-dim">Ninguém cancelou neste mês.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border text-sm">
            {dados.cancelados.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2">
                <span className="text-text-muted">{c.nome}</span>
                <span className="text-xs text-text-dim">{c.motivoSaida || "sem motivo informado"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-bold text-text">O que vem por aí</h2>
        <p className="mb-3 text-xs text-text-dim capitalize">{MESES_NOME[futuro.referencia.getMonth()]}</p>
        {futuro.quantidade === 0 ? (
          <EmptyState>
            Nenhum vencimento cai no próximo mês — os planos atuais vão além disso.
          </EmptyState>
        ) : (
          <div className="flex items-center justify-between">
            <Badge tone="neutral">{futuro.quantidade} clientes vencendo</Badge>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wider text-text-dim">Lucro previsto se todos renovarem</p>
              <p className="text-lg font-bold text-accent">{brl(futuro.previsto)}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
