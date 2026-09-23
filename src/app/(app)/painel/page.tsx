import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dadosPainel, serieReceitaMes } from "@/lib/dados";
import { brl0, dataCurta, diaCivilBr } from "@/lib/format";
import { PLANO_LABEL, diasParaVencer } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/mensagens";
import { Avatar, Badge, Button, Card, EmptyState, Sparkline, StatTile, TrendChip, buttonClassName } from "@/components/ui";
import { DonutChart } from "@/components/charts";
import { cobradosHojePorCliente } from "@/lib/cobrancas";
import { RenovarBotao } from "../clientes/renovar-em-lote/renovar-botao";
import { CobrarBotao } from "../clientes/cobrar-botao";
import { MetaMensalCard } from "./meta-mensal";

const IconCreditos = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M10 2.5l6.5 3.5v8L10 17.5 3.5 14V6L10 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M10 6.5v7M7 8.5l3-2 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function PainelPage() {
  const revendedor = await exigirRevendedor();
  const [dados, cobradosHoje, serie] = await Promise.all([
    dadosPainel(revendedor.id),
    cobradosHojePorCliente(revendedor.id),
    serieReceitaMes(revendedor.id),
  ]);
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);
  const horaBr = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(agora));
  const saudacao = horaBr < 12 ? "Bom dia" : horaBr < 18 ? "Boa tarde" : "Boa noite";
  const dataHoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(agora);
  const receitaMes = dados.receitaRecorrente + dados.receitaApar;
  const fila = [...dados.vencidos, ...dados.vencendo];
  const vencidosSemCobranca = dados.vencidos.filter((c) => !cobradosHoje.has(c.id)).length;

  // Só consulta os contadores de onboarding durante o trial — depois que
  // assina, esse checklist não faz mais sentido e não vale gastar a
  // consulta em todo carregamento do Painel.
  const emTrial = revendedor.statusAssinatura === "TRIAL";
  const [totalServicosOnboarding, totalClientesOnboarding, totalChavesOnboarding] = emTrial
    ? await Promise.all([
        prisma.servico.count({ where: { revendedorId: revendedor.id } }),
        prisma.cliente.count({ where: { revendedorId: revendedor.id } }),
        prisma.chavePix.count({ where: { revendedorId: revendedor.id } }),
      ])
    : [0, 0, 0];
  const passosOnboarding = [
    { label: "Cadastre seu primeiro app/serviço", feito: totalServicosOnboarding > 0, href: "/plataformas" },
    { label: "Cadastre seu primeiro cliente", feito: totalClientesOnboarding > 0, href: "/clientes/novo" },
    { label: "Cadastre uma chave Pix pra receber", feito: totalChavesOnboarding > 0, href: "/configuracoes" },
  ];
  const mostrarOnboarding = emTrial && passosOnboarding.some((p) => !p.feito);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">
            {saudacao}, {revendedor.nome.split(" ")[0]}
          </h1>
          <p className="text-sm capitalize text-text-dim">{dataHoje}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/interessados">
            <Button variant="ghost">Novo interessado</Button>
          </Link>
          <Link href="/clientes/novo">
            <Button variant="ghost">Novo cliente</Button>
          </Link>
          <Link href="/vendas/nova">
            <Button>+ Nova venda</Button>
          </Link>
        </div>
      </div>

      {mostrarOnboarding ? (
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">Primeiros passos</h2>
            <Badge tone="accent">Trial</Badge>
          </div>
          <p className="mb-3 text-xs text-text-dim">Três passos rápidos pra sentir o GestorPro funcionando de verdade.</p>
          <div className="flex flex-col gap-2">
            {passosOnboarding.map((passo) => (
              <Link
                key={passo.label}
                href={passo.href}
                className="flex items-center justify-between gap-3 rounded-xl border border-border-strong px-3.5 py-2.5 hover:border-accent"
              >
                <span className={`text-sm font-semibold ${passo.feito ? "text-text-dim line-through" : "text-text"}`}>
                  {passo.label}
                </span>
                <Badge tone={passo.feito ? "accent" : "neutral"}>{passo.feito ? "Feito" : "Fazer"}</Badge>
              </Link>
            ))}
          </div>
        </Card>
      ) : !dados.temClientes ? (
        <Card className="text-center">
          <p className="text-sm text-text-muted">Comece cadastrando seu primeiro cliente</p>
          <Link href="/clientes/novo" className="mt-3 inline-block">
            <Button>Cadastrar cliente</Button>
          </Link>
        </Card>
      ) : null}

      {fila.length > 0 ? (
        <section
          aria-label="Atenção hoje"
          className="flex flex-col gap-3 rounded-2xl border border-danger-border bg-danger-bg/60 p-4 sm:flex-row sm:items-center"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-text">
              {vencidosSemCobranca > 0
                ? `${vencidosSemCobranca} vencido${vencidosSemCobranca === 1 ? "" : "s"} ainda sem cobrança hoje`
                : "Todos os vencidos já foram cobrados hoje"}
            </p>
            <p className="text-sm text-text-muted">
              <span className="font-semibold text-danger">{dados.vencidos.length} vencidos</span>
              {" · "}
              <span className="font-semibold text-warning">{dados.vencendo.length} vencem em até 5 dias</span>
              {dados.produtosBaixoEstoque.length > 0 ? " · estoque baixo" : ""}
            </p>
          </div>
          {dados.vencidos.length > 0 ? (
            <Link href="/clientes/cobrar-em-lote" className={buttonClassName("primary", "whitespace-nowrap")}>
              Cobrar vencidos em lote
            </Link>
          ) : null}
        </section>
      ) : null}

      <section aria-label="Resultado do mês" className="glow-card grid overflow-hidden rounded-2xl border bg-surface lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-3 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text-muted">Entrou em {MESES[agoraCivil.mes]}</span>
            {serie.variacaoPct != null ? <TrendChip pct={serie.variacaoPct} sufixo={`vs ${MESES[serie.mesAnteriorIdx]}`} /> : null}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
            <p className="whitespace-nowrap text-4xl font-bold tracking-tight text-text md:text-5xl">
              <span className="text-lg font-semibold text-text-dim md:text-xl">R$ </span>
              {receitaMes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {serie.acumulado.length >= 2 && receitaMes > 0 ? (
              <div className="min-w-0 flex-1 pb-1">
                <Sparkline valores={serie.acumulado} width={460} height={60} className="h-[60px] w-full" />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-text-dim">
              Renovações <strong className="text-money">{brl0(dados.receitaRecorrente)}</strong>
            </span>
            <span className="text-text-dim">
              Aparelhos <strong className="text-money">{brl0(dados.receitaApar)}</strong>
            </span>
            <span className="text-text-dim">
              Custo <strong className="text-danger">− {brl0(dados.custoTotal)}</strong>
            </span>
            <span className="text-text-dim">
              Lucro <strong className={dados.lucro >= 0 ? "text-money" : "text-danger"}>{brl0(dados.lucro)}</strong>
            </span>
          </div>
        </div>
        <div className="flex items-center border-t border-border bg-surface-2 p-5 lg:border-l lg:border-t-0">
          <MetaMensalCard meta={revendedor.metaReceitaMensal} receitaAtual={receitaMes} diasRestantes={serie.diasRestantes} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Lucro do mês</span>
          <span className={`text-2xl font-bold tabular-nums ${dados.lucro >= 0 ? "text-money" : "text-danger"}`}>{brl0(dados.lucro)}</span>
          <span className="text-xs text-text-dim">
            {receitaMes > 0 ? `margem de ${Math.round((dados.lucro / receitaMes) * 100)}%` : "sem vendas ainda"}
          </span>
        </Card>
        <Link href="/relatorio" className="flex">
          <Card className="flex w-full flex-col gap-1 transition hover:border-accent-strong">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              Previsto p/ {MESES[dados.proximoMes.getMonth()]}
            </span>
            <span className="text-2xl font-bold tabular-nums text-text">{brl0(dados.previstoProxMes)}</span>
            <span className="text-xs text-text-dim">
              ≈ {brl0(dados.previstoProxMesRealista)} com {dados.taxaRetencao.toFixed(0)}% de retenção
            </span>
          </Card>
        </Link>
        <Link href="/clientes" className="flex">
          <Card className="flex w-full flex-col gap-1 transition hover:border-accent-strong">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Clientes ativos</span>
            <span className="text-2xl font-bold tabular-nums text-text">{dados.ativos}</span>
            <span className="text-xs text-text-dim">
              {dados.vencidos.length} vencidos · {dados.vencendo.length} vencendo
            </span>
          </Card>
        </Link>
        <Link href="/plataformas" className="flex">
          <StatTile
            label="Créditos"
            value={String(dados.saldoCreditos)}
            sub={dados.creditosBaixos ? "Saldo baixo — repor" : "Saldo disponível"}
            tone={dados.creditosBaixos ? "danger" : dados.saldoCreditos > 0 ? "accent" : "neutral"}
            icon={IconCreditos}
          />
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
      <Card className="p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-text">Fila de cobrança</h2>
          <Link href="/clientes" className="text-xs font-semibold text-accent">
            Ver todos os clientes
          </Link>
        </div>

        {fila.length === 0 ? (
          <div className="p-5">
            <EmptyState>Nenhum cliente vencendo nos próximos dias.</EmptyState>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {fila.map((cliente) => {
              const dias = diasParaVencer(cliente.vencimento);
              const vencido = dias < 0;
              const rotulo = vencido
                ? `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} vencido`
                : dias === 0
                  ? "Vence hoje"
                  : `Vence em ${dias} dia${dias === 1 ? "" : "s"}`;
              return (
                <div key={cliente.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                  <Avatar nome={cliente.nome} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/clientes/${cliente.id}`} className="block truncate text-sm font-semibold text-text hover:text-accent">
                      {cliente.nome}
                    </Link>
                    <p className="text-xs text-text-dim">
                      {PLANO_LABEL[cliente.plano]} · vence {dataCurta(cliente.vencimento)}
                    </p>
                  </div>
                  <Badge tone={vencido ? "danger" : "warning"}>{rotulo}</Badge>
                  <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                    {cliente.whatsapp ? (
                      <CobrarBotao
                        clienteId={cliente.id}
                        cobradoEm={cobradosHoje.get(cliente.id) ?? null}
                        label={vencido ? "Cobrar" : "Lembrar"}
                        variant="whatsapp"
                        className="flex-1 whitespace-nowrap sm:flex-none"
                      />
                    ) : null}
                    <RenovarBotao clienteId={cliente.id} className="flex-1 whitespace-nowrap sm:flex-none" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {dados.leadsParaRetornar.length > 0 ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">Interessados pra retornar</h2>
            <Link href="/clientes?aba=interessados" className="text-xs font-semibold text-accent">
              Ver todos
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {dados.leadsParaRetornar.map((lead) => {
              const dias = diasParaVencer(lead.retornarEm!);
              const tomPrazo = dias < 0 ? "danger" : dias === 0 ? "warning" : "neutral";
              const labelPrazo = dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? "Hoje" : `Em ${dias}d`;
              return (
                <div key={lead.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{lead.nome}</p>
                    <p className="truncate text-xs text-text-dim">
                      {lead.interesse ?? "—"} · retorno {dataCurta(lead.retornarEm!)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={tomPrazo}>{labelPrazo}</Badge>
                    {lead.whatsapp ? (
                      <a
                        href={linkWhatsApp(lead.whatsapp, `Olá ${lead.nome.split(" ")[0]}, tudo bem? Passando pra saber se ficou alguma dúvida.`)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="whatsapp" className="whitespace-nowrap">
                          Chamar
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {dados.clientesEsfriando.length > 0 ? (
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">Clientes esfriando</h2>
            <Badge tone="warning">Risco de cancelamento silencioso</Badge>
          </div>
          <p className="mb-3 text-xs text-text-dim">
            Historicamente só renovam depois de várias cobranças — e o ciclo deles está vencendo ou já venceu agora.
          </p>
          <div className="flex flex-col divide-y divide-border">
            {dados.clientesEsfriando.map(({ cliente, pontualidade }) => (
              <div key={cliente.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/clientes/${cliente.id}`} className="block truncate text-sm font-semibold text-text hover:text-accent">
                    {cliente.nome}
                  </Link>
                  <p className="text-xs text-text-dim">
                    {pontualidade.label} · vence {dataCurta(cliente.vencimento)}
                  </p>
                </div>
                {cliente.whatsapp ? (
                  <CobrarBotao
                    clienteId={cliente.id}
                    cobradoEm={cobradosHoje.get(cliente.id) ?? null}
                    label="Cobrar agora"
                    variant="whatsapp"
                    className="whitespace-nowrap"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      </div>

      <aside className="flex flex-col gap-6">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-text">Carteira de clientes</span>
            <Link href="/clientes" className="text-xs font-semibold text-accent hover:brightness-110">
              Ver todos
            </Link>
          </div>
          <DonutChart
            centroLabel="Total"
            centroValor={String(dados.ativos + dados.vencendo.length + dados.vencidos.length)}
            segmentos={[
              { label: "Ativos", valor: dados.ativos },
              { label: "Vencendo", valor: dados.vencendo.length },
              { label: "Vencidos", valor: dados.vencidos.length },
            ]}
          />
        </Card>

        {dados.produtosBaixoEstoque.length > 0 ? (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-text">Estoque</h2>
              <Link href="/estoque" className="text-xs font-semibold text-accent">
                Abrir
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {dados.produtosBaixoEstoque.map((p) => (
                <Link key={p.id} href="/estoque" className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-text">{p.modelo}</span>
                  <Badge tone="warning">Repor</Badge>
                </Link>
              ))}
            </div>
          </Card>
        ) : null}

        {dados.aniversariantes.length > 0 ? (
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Aniversário de casa</h2>
            <div className="flex flex-col gap-2">
              {dados.aniversariantes.map(({ cliente, anos }) => (
                <div key={cliente.id} className="flex items-center gap-3 text-sm">
                  <Avatar nome={cliente.nome} size={30} />
                  <Link href={`/clientes/${cliente.id}`} className="min-w-0 flex-1 truncate text-text-muted hover:text-accent">
                    {cliente.nome}
                  </Link>
                  <Badge tone="accent">
                    {anos} ano{anos === 1 ? "" : "s"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </aside>
      </div>
    </div>
  );
}
