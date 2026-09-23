import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dadosPainel } from "@/lib/dados";
import { brl0, dataCurta, diaCivilBr } from "@/lib/format";
import { PLANO_LABEL, diasParaVencer } from "@/lib/planos";
import { linkWhatsApp } from "@/lib/mensagens";
import { Badge, Button, Card, EmptyState, StatTile } from "@/components/ui";
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
  const [dados, cobradosHoje] = await Promise.all([dadosPainel(revendedor.id), cobradosHojePorCliente(revendedor.id)]);
  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);

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
          <h1 className="text-lg font-bold text-text">Painel</h1>
          <p className="text-xs text-text-dim">Olá, {revendedor.nome.split(" ")[0]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/interessados">
            <Button variant="ghost">Novo interessado</Button>
          </Link>
          <Link href="/clientes/novo">
            <Button variant="ghost">Novo cliente</Button>
          </Link>
          <Link href="/vendas/nova">
            <Button>Nova venda</Button>
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

      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1.4fr_1fr_0.7fr]">
        <Card className="glow-card flex flex-col gap-2.5 bg-gradient-to-br from-accent-soft to-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Entrou no mês</span>
            <span className="whitespace-nowrap text-[10px] font-semibold text-text-dim">
              Entradas de {String(agoraCivil.mes + 1).padStart(2, "0")}/{agoraCivil.ano}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-semibold text-text-dim">R$</span>
            <span className="text-3xl font-bold tracking-tight text-text">
              {(dados.receitaRecorrente + dados.receitaApar).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {dados.receitaRecorrente + dados.receitaApar > 0 ? (
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
              <div className="rounded-full bg-accent" style={{ flex: dados.receitaRecorrente || 0.001 }} />
              <div className="rounded-full bg-text-dim" style={{ flex: dados.receitaApar || 0.001 }} />
            </div>
          ) : (
            <div className="h-1.5 rounded-full bg-accent-strong" />
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-text-muted">
            <span>Renovações {brl0(dados.receitaRecorrente)}</span>
            <span>Aparelhos {brl0(dados.receitaApar)}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border-strong pt-2.5 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-text-dim">Custo</span>
              <span className="font-semibold text-danger">− {brl0(dados.custoTotal)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-text-dim">Lucro</span>
              <span className={`font-semibold ${dados.lucro >= 0 ? "text-accent" : "text-danger"}`}>{brl0(dados.lucro)}</span>
            </div>
            <Link href="/relatorio" className="flex flex-col gap-0.5">
              <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                Previsto p/ {MESES[dados.proximoMes.getMonth()]}
              </span>
              <span className="font-semibold text-text-muted hover:text-accent">{brl0(dados.previstoProxMes)}</span>
              <span className="whitespace-nowrap text-[10px] text-text-dim">
                ≈ {brl0(dados.previstoProxMesRealista)} com {dados.taxaRetencao.toFixed(0)}% de retenção
              </span>
            </Link>
          </div>
        </Card>

        <Card className="glow-card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Carteira de clientes</span>
            <Link href="/clientes" className="text-[11px] font-semibold text-accent hover:brightness-110">
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

      <MetaMensalCard meta={revendedor.metaReceitaMensal} receitaAtual={dados.receitaRecorrente + dados.receitaApar} />

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

      {dados.aniversariantes.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Aniversário de casa 🎉</h2>
          <div className="flex flex-col gap-2">
            {dados.aniversariantes.map(({ cliente, anos }) => (
              <div key={cliente.id} className="flex items-center justify-between text-sm">
                <Link href={`/clientes/${cliente.id}`} className="text-text-muted hover:text-accent">
                  {cliente.nome}
                </Link>
                <Badge tone="accent">
                  {anos} ano{anos === 1 ? "" : "s"} de casa
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {dados.produtosBaixoEstoque.length > 0 ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-text">Estoque de produtos</h2>
            <Link href="/estoque" className="text-xs font-semibold text-accent">
              Abrir
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {dados.produtosBaixoEstoque.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{p.modelo}</span>
                <Link href="/estoque">
                  <Badge tone="warning">Repor</Badge>
                </Link>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Vencendo / vencidos</h2>
          <Link href="/clientes" className="text-xs font-semibold text-accent">
            Ver todos os clientes
          </Link>
        </div>

        {dados.vencendo.length + dados.vencidos.length === 0 ? (
          <EmptyState>Nenhum cliente vencendo nos próximos dias.</EmptyState>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {[...dados.vencidos, ...dados.vencendo].map((cliente) => (
              <div key={cliente.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/clientes/${cliente.id}`} className="block truncate text-sm font-semibold text-text hover:text-accent">
                    {cliente.nome}
                  </Link>
                  <p className="text-xs text-text-dim">
                    {PLANO_LABEL[cliente.plano]} · vence {dataCurta(cliente.vencimento)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {cliente.whatsapp ? (
                    <CobrarBotao
                      clienteId={cliente.id}
                      cobradoEm={cobradosHoje.get(cliente.id) ?? null}
                      label="Cobrar agora"
                      variant="whatsapp"
                      className="whitespace-nowrap"
                    />
                  ) : null}
                  <RenovarBotao clienteId={cliente.id} className="whitespace-nowrap" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
