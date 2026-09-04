import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { dadosAdmin, dadosCrescimento } from "@/lib/dados-admin";
import { brl0, dataCurta } from "@/lib/format";
import { diasParaVencer } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/mensagens";
import { Badge, Button, Card, StatTile } from "@/components/ui";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function AdminPainelPage() {
  await exigirAdmin();
  const [dados, crescimento] = await Promise.all([dadosAdmin(), dadosCrescimento()]);
  const mrr = dados.previstoMensal + dados.previstoAnual;
  const arr = mrr * 12;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-text">Painel do administrador</h1>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Este mês</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Receita de assinaturas" value={brl0(dados.receitaMes)} tone="accent" />
          <StatTile
            label="Retenção"
            value={`${dados.taxaRetencao.toFixed(0)}%`}
            sub={`${dados.pausadosMes} pausado${dados.pausadosMes === 1 ? "" : "s"} este mês`}
            tone={dados.taxaRetencao >= 90 ? "accent" : dados.taxaRetencao >= 75 ? "warning" : "danger"}
          />
          <StatTile label="MRR" value={brl0(mrr)} sub="receita recorrente mensal" tone="accent" />
          <StatTile label="ARR" value={brl0(arr)} sub="MRR × 12" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">O que vem por aí</p>
        <Card className="border-accent-strong bg-accent-soft/20">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Previsto para {MESES[dados.proximoMes.getMonth()]}
          </p>
          <p className="mt-1 text-3xl font-bold text-accent">{brl0(dados.previstoProxMes)}</p>
          <p className="mt-1 text-xs text-text-dim">Receita prevista se todos os assinantes ativos continuarem</p>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Planos mensais</p>
              <p className="mt-0.5 font-semibold text-text">{brl0(dados.previstoMensal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Planos anuais (mensalizado)</p>
              <p className="mt-0.5 font-semibold text-text">{brl0(dados.previstoAnual)}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-text-dim">
            {dados.ativos} assinante{dados.ativos === 1 ? "" : "s"} ativo{dados.ativos === 1 ? "" : "s"}
            {dados.ativosSemPagamento > 0
              ? ` (${dados.ativosSemPagamento} sem pagamento registrado, não entra na conta)`
              : ""}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Assinantes" value={String(dados.total)} tone="accent" />
        <StatTile label="Em trial" value={String(dados.trial)} />
        <StatTile label="Ativos" value={String(dados.ativos)} tone="accent" />
        <StatTile label="Pausados" value={String(dados.pausados)} tone="warning" />
      </div>

      {dados.trialsVencendo.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Trials vencendo em breve</h2>
          <div className="flex flex-col divide-y divide-border">
            {dados.trialsVencendo.map((r) => {
              const dias = diasParaVencer(r.trialFim);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/admin/assinantes/${r.id}`} className="truncate text-sm font-semibold text-text hover:text-accent">
                      {r.nome}
                    </Link>
                    <p className="text-xs text-text-dim">
                      {dias < 0 ? "trial expirado" : dias === 0 ? "vence hoje" : `vence em ${dias}d`}
                    </p>
                  </div>
                  {r.whatsapp ? (
                    <a href={linkWhatsApp(r.whatsapp)} target="_blank" rel="noreferrer">
                      <Badge tone={dias <= 0 ? "danger" : "warning"}>Chamar</Badge>
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Crescimento</p>
        <div className="flex flex-col gap-3">
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Funil — de lead a assinante pago</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="text-xl font-bold text-text">{crescimento.totalInteressados}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Interessados</p>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="text-xl font-bold text-text">{crescimento.totalRevendedores}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Criaram trial</p>
              </div>
              <div className="rounded-xl border border-accent-strong bg-accent-soft p-3">
                <p className="text-xl font-bold text-accent">{crescimento.convertidos}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Viraram pago</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-dim">
              <span>
                Interessado → conta: <strong className="text-text">{crescimento.taxaConversaoInteressados.toFixed(0)}%</strong>
              </span>
              <span>
                Trial → pago: <strong className="text-text">{crescimento.taxaConversaoTrial.toFixed(0)}%</strong>
              </span>
              {crescimento.diaMedioConversao != null ? (
                <span>
                  Converte em média no dia{" "}
                  <strong className="text-text">
                    {crescimento.diaMedioConversao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </strong>{" "}
                  do trial
                </span>
              ) : null}
            </div>
            {crescimento.convertidos > 0 ? (
              <div className="mt-3 flex items-end gap-1 border-t border-border pt-3">
                {crescimento.histogramaDias.map((h) => (
                  <div key={h.dia} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-accent"
                      style={{
                        height: `${Math.max(4, (h.quantidade / Math.max(...crescimento.histogramaDias.map((x) => x.quantidade), 1)) * 40)}px`,
                      }}
                    />
                    <span className="text-[9px] text-text-dim">{h.dia === 7 ? "7+" : h.dia}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          {crescimento.trialsEngajados.length > 0 ? (
            <Card>
              <h2 className="mb-1 text-sm font-bold text-text">Trials engajados</h2>
              <p className="mb-3 text-xs text-text-dim">Já estão usando de verdade — bom momento pra ajudar a converter.</p>
              <div className="flex flex-col divide-y divide-border">
                {crescimento.trialsEngajados.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link href={`/admin/assinantes/${r.id}`} className="truncate text-sm font-semibold text-text hover:text-accent">
                        {r.nome}
                      </Link>
                      <p className="text-xs text-text-dim">
                        {r._count.clientes} cliente{r._count.clientes === 1 ? "" : "s"} · {r._count.vendas} venda
                        {r._count.vendas === 1 ? "" : "s"}
                      </p>
                    </div>
                    {r.whatsapp ? (
                      <a href={linkWhatsApp(r.whatsapp)} target="_blank" rel="noreferrer">
                        <Badge tone="accent">Chamar</Badge>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {crescimento.coorte.length > 0 ? (
            <Card className="p-0">
              <div className="p-4 pb-0">
                <h2 className="text-sm font-bold text-text">Coorte de retenção</h2>
                <p className="mt-1 text-xs text-text-dim">De quem virou pagante em cada mês, quantos % ainda estão ativos hoje.</p>
              </div>
              <div className="mt-3 flex flex-col divide-y divide-border">
                {crescimento.coorte.map((c) => (
                  <div key={`${c.ano}-${c.mes}`} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span className="text-text-muted">
                      {MESES[c.mes]}/{c.ano}
                    </span>
                    <span className="text-xs text-text-dim">
                      {c.aindaAtivos} de {c.total}
                    </span>
                    <Badge tone={c.retencaoPct >= 75 ? "accent" : c.retencaoPct >= 50 ? "warning" : "danger"}>
                      {c.retencaoPct.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {crescimento.cancelamentosRecentes.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-bold text-text">Motivos de cancelamento</h2>
              <div className="flex flex-col divide-y divide-border">
                {crescimento.cancelamentosRecentes.map((r) => (
                  <div key={r.id} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/admin/assinantes/${r.id}`} className="truncate text-sm font-semibold text-text hover:text-accent">
                        {r.nome}
                      </Link>
                      <span className="whitespace-nowrap text-xs text-text-dim">
                        {r.canceladoEm ? dataCurta(r.canceladoEm) : "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-dim">{r.motivoCancelamento || "Não informou o motivo."}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Link href="/admin/assinantes">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Assinantes</h2>
            <p className="mt-1 text-sm text-text-dim">Gerencie acesso, veja uso e os serviços que cada um revende.</p>
          </Card>
        </Link>
        <Link href="/admin/interessados">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Interessados</h2>
            <p className="mt-1 text-sm text-text-dim">{dados.interessadosAbertos} em aberto para retornar contato.</p>
          </Card>
        </Link>
        <Link href="/admin/comunicados">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Comunicados</h2>
            <p className="mt-1 text-sm text-text-dim">Aviso em massa por app, publicado para todos os assinantes.</p>
          </Card>
        </Link>
        <Link href="/admin/cupons">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Cupons</h2>
            <p className="mt-1 text-sm text-text-dim">Descontos pra campanhas de venda da assinatura.</p>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Lembrete diário</h2>
            <p className="mt-1 text-sm text-text-dim">
              Ative pra receber um aviso todo dia sobre trials vencendo e pagamentos de assinatura recusados.
            </p>
          </div>
          <Link href="/configuracoes">
            <Button variant="ghost">Configurações</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
