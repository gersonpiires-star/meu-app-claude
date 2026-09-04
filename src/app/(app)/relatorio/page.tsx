import { exigirRevendedor, souFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dadosMes, proximoMes, ultimosMeses } from "@/lib/relatorio";
import { limitesDoMes } from "@/lib/dados";
import { gradeDoMes } from "@/lib/calendario";
import { brl, dataCurta, dataPorExtenso, diaCivilBr } from "@/lib/format";
import { PLANO_LABEL, PLANO_MESES } from "@/lib/planos";
import { Badge, Card, EmptyState } from "@/components/ui";
import { GraficoMeses } from "./grafico-meses";
import { CalendarioMes } from "./calendario-mes";
import { RenovacoesPorServico, type GrupoRenovacao } from "./renovacoes-por-servico";
import { VendasDetalhadas, type VendaDetalhe } from "./vendas-detalhadas";
import { editarRenovacao } from "./actions";

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
  const ehFuncionario = await souFuncionario();
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);
  const { ano: anoParam, mes: mesParam } = await searchParams;
  const ano = anoParam ? Number(anoParam) : agoraCivil.ano;
  const mes = mesParam ? Number(mesParam) : agoraCivil.mes;

  const { inicio: inicioMesAtual, fim: fimMesAtual } = limitesDoMes(agora);
  const [meses, dados, futuro, fechamentos, clientesDoMesAtual] = await Promise.all([
    ultimosMeses(revendedor.id),
    dadosMes(revendedor.id, ano, mes),
    proximoMes(revendedor.id),
    prisma.fechamentoMes.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: [{ ano: "desc" }, { mes: "desc" }],
      take: 12,
    }),
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" }, vencimento: { gte: inicioMesAtual, lt: fimMesAtual } },
      select: { nome: true, vencimento: true },
    }),
  ]);
  const celulasCalendario = gradeDoMes(clientesDoMesAtual, agora);

  const gruposRenovMap = new Map<string, GrupoRenovacao>();
  for (const r of dados.renovacoes) {
    const nome = r.cliente.servico?.nome ?? "Sem serviço";
    const atual = gruposRenovMap.get(nome) ?? { servico: nome, qtd: 0, meses: 0, bruto: 0, custo: 0, itens: [] };
    atual.qtd += 1;
    atual.meses += PLANO_MESES[r.plano];
    atual.bruto += r.valor;
    atual.custo += r.custo;
    atual.itens.push({
      id: r.id,
      nome: r.cliente.nome,
      sub: `${PLANO_LABEL[r.plano]} · ${dataCurta(r.data)}`,
      liquido: r.valor - r.custo,
      valor: r.valor,
      custo: r.custo,
    });
    gruposRenovMap.set(nome, atual);
  }
  const gruposRenovacao = [...gruposRenovMap.values()].sort((a, b) => b.bruto - b.custo - (a.bruto - a.custo));

  const vendasDetalhadas: VendaDetalhe[] = dados.vendas.map((v) => {
    const bruto = v.quantidade * v.valorUnitario;
    return {
      id: v.id,
      nome: v.cliente?.nome ?? "Venda avulsa",
      detalhe: `${v.produto.modelo} · ${brl(bruto)} − ${brl(v.custoTotal + v.taxa)}`,
      liquidoTexto: brl(v.liquido),
      liquidoPositivo: v.liquido >= 0,
      linhas: [
        { rot: "Produto", val: v.produto.modelo },
        { rot: "Data", val: dataCurta(v.data) },
        { rot: "Pagamento", val: v.formaPagamento },
        { rot: "Quantidade", val: `${v.quantidade} un. × ${brl(v.valorUnitario)}` },
        { rot: "Valor da venda", val: brl(bruto) },
        { rot: "Custo de compra", val: `− ${brl(v.custoTotal)} (${brl(v.custoUnitario)}/un)` },
        ...(v.taxa > 0 ? [{ rot: "Taxa", val: `− ${brl(v.taxa)}` }] : []),
        { rot: "Líquido", val: brl(v.liquido) },
        { rot: "Margem", val: bruto > 0 ? `${Math.round((v.liquido / bruto) * 100)}%` : "—" },
      ],
    };
  });

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
        <h2 className="mb-3 text-sm font-bold text-text">Renovações do mês · por serviço</h2>
        <RenovacoesPorServico grupos={gruposRenovacao} acao={editarRenovacao} podeEditar={!ehFuncionario} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Vendas do mês</h2>
        <VendasDetalhadas vendas={vendasDetalhadas} />
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
        <h2 className="mb-3 text-sm font-bold text-text">Calendário do mês</h2>
        <CalendarioMes celulas={celulasCalendario} hojeDia={agoraCivil.dia} />
      </Card>

      {fechamentos.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Fechamentos de mês</h2>
          <div className="flex flex-col divide-y divide-border text-sm">
            {fechamentos.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold text-text">
                    {MESES_NOME[f.mes][0].toUpperCase() + MESES_NOME[f.mes].slice(1)} de {f.ano}
                  </p>
                  <p className="text-xs text-text-dim">
                    {f.clientesAtivos} cliente(s) · arquivado em {dataPorExtenso(f.fechadoEm)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-accent">{brl(f.lucro)}</p>
                  <p className="text-xs text-text-dim">
                    {brl(f.receita)} − {brl(f.custo)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

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
