import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirRevendedor, permissoesFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dadosMes, proximoMes, ultimosMeses, visaoGeralPeriodo, oQueMaisVendeNoPeriodo } from "@/lib/relatorio";
import { limitesDoMes } from "@/lib/dados";
import { gradeDoMes } from "@/lib/calendario";
import { brl, brl0, dataCurta, dataPorExtenso, diaCivilBr } from "@/lib/format";
import { PLANO_LABEL, PLANO_MESES } from "@/lib/planos";
import { Card, Sparkline, StatTile, cx } from "@/components/ui";
import { GraficoMeses } from "./grafico-meses";
import { ReceitaPorMes } from "./receita-por-mes";
import { CalendarioMes } from "./calendario-mes";
import { RenovacoesPorServico, type GrupoRenovacao } from "./renovacoes-por-servico";
import { VendasDetalhadas, type VendaDetalhe } from "./vendas-detalhadas";
import { editarRenovacao, editarVenda } from "./actions";
import { excluirRenovacao } from "../clientes/actions";

const PERIODOS = [
  { chave: "30", label: "30 dias", meses: 1 },
  { chave: "6m", label: "6 meses", meses: 6 },
  { chave: "12m", label: "12 meses", meses: 12 },
] as const;

const IconClientesNovos = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="8" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 16c0-2.8 2.2-4.3 5-4.3s5 1.5 5 4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14.5 6v4M12.5 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconNaoRenovaram = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const IconCustos = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14 13l2.5 2.5L14 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconLucro = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.5v7M7.5 8.3c0-1 .9-1.8 2.5-1.8s2.5.7 2.5 1.6c0 2.2-5 .9-5 3 0 1 1 1.7 2.5 1.7s2.5-.7 2.5-1.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconMargem = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="14" cy="14" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14.5 5.5 5.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; periodo?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { podeVerFinanceiro, podeExcluir } = await permissoesFuncionario();
  if (!podeVerFinanceiro) redirect("/painel");
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);
  const { ano: anoParam, mes: mesParam, periodo: periodoParam } = await searchParams;
  const ano = anoParam ? Number(anoParam) : agoraCivil.ano;
  const mes = mesParam ? Number(mesParam) : agoraCivil.mes;
  const periodo = PERIODOS.find((p) => p.chave === periodoParam) ?? PERIODOS[1];

  const { inicio: inicioMesAtual, fim: fimMesAtual } = limitesDoMes(agora);
  const [meses, dados, futuro, fechamentos, clientesDoMesAtual, visaoGeral, maisVendidos] = await Promise.all([
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
    visaoGeralPeriodo(revendedor.id, periodo.meses),
    oQueMaisVendeNoPeriodo(revendedor.id, periodo.meses),
  ]);
  const celulasCalendario = gradeDoMes(clientesDoMesAtual, agora);

  const gruposRenovMap = new Map<string, GrupoRenovacao>();
  for (const r of dados.renovacoes) {
    const nome = r.servico?.nome ?? "Sem serviço";
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
      valorUnitario: v.valorUnitario,
      custoUnitario: v.custoUnitario,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Relatório</h1>
          <p className="text-xs text-text-dim">Como o negócio está indo ao longo do tempo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-xl border border-border-strong p-1 text-sm">
            {PERIODOS.map((p) => (
              <Link
                key={p.chave}
                href={`/relatorio?periodo=${p.chave}`}
                className={cx(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold",
                  periodo.chave === p.chave ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <a
            href={`/api/relatorio/pdf?periodo=${periodo.chave}`}
            className="flex items-center gap-1.5 rounded-xl border border-border-strong px-3 py-2 text-sm font-semibold text-text-muted hover:bg-surface-2 hover:text-text"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path d="M10 3v9m0 0-3-3m3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 14v1.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Exportar PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label={`Receita (${periodo.label})`}
          value={brl0(visaoGeral.receita)}
          sub={`${visaoGeral.variacaoPct >= 0 ? "+" : ""}${visaoGeral.variacaoPct.toFixed(0)}%`}
          tone={visaoGeral.variacaoPct >= 0 ? "money" : "danger"}
          icon={<Sparkline valores={visaoGeral.porMes.map((m) => m.receita)} width={36} height={14} cor="var(--money)" />}
        />
        <StatTile label={`Lucro (${periodo.label})`} value={brl0(visaoGeral.lucro)} sub={`margem de ${visaoGeral.margem.toFixed(0)}%`} tone="money" icon={IconLucro} />
        <StatTile label="Clientes novos" value={String(visaoGeral.clientesNovos)} sub="no período" icon={IconClientesNovos} />
        <StatTile
          label="Não renovaram"
          value={String(visaoGeral.naoRenovaram)}
          sub={`taxa de perda de ${visaoGeral.taxaPerdaPct.toFixed(0)}%`}
          tone={visaoGeral.naoRenovaram > 0 ? "danger" : "neutral"}
          icon={IconNaoRenovaram}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">Receita por mês</h2>
            {mes === agoraCivil.mes && ano === agoraCivil.ano ? (
              <span className="text-xs text-text-dim">{MESES_NOME[agoraCivil.mes]} ainda em andamento</span>
            ) : null}
          </div>
          <ReceitaPorMes meses={visaoGeral.porMes} />
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-2 text-sm font-bold text-text">Retenção da carteira</h2>
            <p className="text-2xl font-bold text-text">{visaoGeral.retencaoPct.toFixed(0)}%</p>
            <p className="mb-3 text-xs text-text-dim">dos clientes ativos estão em dia</p>
            <div className="flex h-2 overflow-hidden rounded-full bg-border">
              {visaoGeral.emDia > 0 ? <div className="h-2 bg-accent" style={{ width: `${(visaoGeral.emDia / (visaoGeral.ativos || 1)) * 100}%` }} /> : null}
              {visaoGeral.vencendo > 0 ? <div className="h-2 bg-warning" style={{ width: `${(visaoGeral.vencendo / (visaoGeral.ativos || 1)) * 100}%` }} /> : null}
              {visaoGeral.vencidos > 0 ? <div className="h-2 bg-danger" style={{ width: `${(visaoGeral.vencidos / (visaoGeral.ativos || 1)) * 100}%` }} /> : null}
            </div>
            <p className="mt-2 text-xs text-text-dim">
              {visaoGeral.emDia} em dia · {visaoGeral.vencendo} vencendo · {visaoGeral.vencidos} vencidos
            </p>
            {visaoGeral.vencidos > 0 ? (
              <p className="mt-2 text-xs text-text-dim">
                Se {visaoGeral.vencidos === 1 ? "o vencido renovar" : `os ${visaoGeral.vencidos} vencidos renovarem`}, a carteira ativa sobe para{" "}
                <span className="font-semibold text-text">
                  {visaoGeral.carteiraProjetada} cliente{visaoGeral.carteiraProjetada === 1 ? "" : "s"} ({visaoGeral.pctProjetada.toFixed(0)}%)
                </span>{" "}
                e entram mais <span className="font-semibold text-money">{brl0(visaoGeral.valorVencidos)}</span>.
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-bold text-text">Previsão de {MESES_NOME[futuro.referencia.getMonth()]}</h2>
            {futuro.quantidade === 0 ? (
              <p className="text-sm text-text-dim">Nenhum vencimento no próximo mês.</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-money">{brl(futuro.previsto)}</p>
                <p className="text-xs text-text-dim">
                  {futuro.quantidade} cliente{futuro.quantidade === 1 ? "" : "s"} × se todos renovarem
                </p>
                <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-dim">100% renovam</span>
                    <span className="font-semibold text-text">{brl(futuro.previsto)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-dim">90% renovam</span>
                    <span className="font-semibold text-text">≈ {brl(futuro.previsto * 0.9)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-dim">75% renovam</span>
                    <span className="font-semibold text-text">≈ {brl(futuro.previsto * 0.75)}</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {maisVendidos.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <h2 className="p-4 pb-0 text-sm font-bold text-text">O que mais vende ({periodo.label})</h2>
          <div className="grid min-w-[500px] grid-cols-[1.5fr_0.8fr_1fr_1fr] gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            <span>Produto / Plano</span>
            <span>Vendas</span>
            <span>Receita</span>
            <span>Lucro</span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {maisVendidos.map((m) => (
              <div key={m.nome} className="grid min-w-[500px] grid-cols-[1.5fr_0.8fr_1fr_1fr] items-center gap-3 px-4 py-2.5 text-sm">
                <span className="truncate text-text">{m.nome}</span>
                <span className="text-text-muted">{m.vendas}</span>
                <span className="font-semibold text-accent">{brl0(m.receita)}</span>
                <span className="font-semibold text-money">{brl0(m.lucro)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-5">
        <div>
          <h2 className="text-base font-bold text-text">
            Detalhe do mês · {MESES_NOME[mes]} de {ano}
          </h2>
          <p className="text-xs text-text-dim">Navegue mês a mês pra fechar contas, ver o calendário e ajustar lançamentos</p>
        </div>
      </div>

      <Card>
        <GraficoMeses meses={meses} selecionado={{ ano, mes }} />
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Custos" value={`− ${brl(dados.custo)}`} tone="danger" icon={IconCustos} />
        <StatTile label="Lucro do mês" value={brl(dados.lucro)} tone="money" icon={IconLucro} />
        <StatTile label="Margem" value={`${dados.margem.toFixed(0)}%`} icon={IconMargem} />
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Renovações do mês · por serviço</h2>
        <RenovacoesPorServico grupos={gruposRenovacao} acao={editarRenovacao} acaoExcluir={excluirRenovacao} podeEditar={true} podeExcluir={podeExcluir} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Vendas do mês</h2>
        <VendasDetalhadas vendas={vendasDetalhadas} acao={editarVenda} podeEditar={true} />
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
                  <p className="font-semibold text-money">{brl(f.lucro)}</p>
                  <p className="text-xs text-text-dim">
                    {brl(f.receita)} − {brl(f.custo)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
