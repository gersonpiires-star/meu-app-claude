import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { dadosPainel } from "@/lib/dados";
import { brl0, dataCurta } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { cobradosHojePorCliente } from "@/lib/cobrancas";
import { RenovarBotao } from "../clientes/renovar-em-lote/renovar-botao";
import { CobrarBotao } from "../clientes/cobrar-botao";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function PainelPage() {
  const revendedor = await exigirRevendedor();
  const [dados, cobradosHoje] = await Promise.all([dadosPainel(revendedor.id), cobradosHojePorCliente(revendedor.id)]);
  const agora = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Painel</h1>
          <p className="text-xs text-text-dim">Olá, {revendedor.nome.split(" ")[0]}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/clientes/novo">
            <Button variant="ghost">Novo cliente</Button>
          </Link>
          <Link href="/vendas/nova">
            <Button>Nova venda</Button>
          </Link>
        </div>
      </div>

      {!dados.temClientes ? (
        <Card className="text-center">
          <p className="text-sm text-text-muted">Comece cadastrando seu primeiro cliente</p>
          <Link href="/clientes/novo" className="mt-3 inline-block">
            <Button>Cadastrar cliente</Button>
          </Link>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-[1.7fr_1fr_1fr_1fr_1fr]">
        <Card className="col-span-2 flex flex-col gap-2.5 bg-gradient-to-br from-accent-soft to-surface md:col-span-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Entrou no mês</span>
            <span className="whitespace-nowrap text-[10px] font-semibold text-text-dim">
              Entradas de {String(agora.getMonth() + 1).padStart(2, "0")}/{agora.getFullYear()}
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
            </Link>
          </div>
        </Card>

        <Link href="/clientes?aba=ativos" className="flex">
          <Card className="flex flex-1 flex-col justify-center gap-0.5 hover:border-border-strong">
            <span className="text-xl font-bold text-text">{dados.ativos}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Clientes ativos</span>
          </Card>
        </Link>
        <Link href="/clientes?aba=atencao" className="flex">
          <Card className="flex flex-1 flex-col justify-center gap-0.5 border-warning-border bg-warning-bg hover:brightness-110">
            <span className="text-xl font-bold text-warning">{dados.vencendo.length}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">Vencendo</span>
          </Card>
        </Link>
        <Link href="/clientes?aba=atencao" className="flex">
          <Card className="flex flex-1 flex-col justify-center gap-0.5 hover:border-border-strong">
            <span className="text-xl font-bold text-text">{dados.vencidos.length}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Vencidos</span>
          </Card>
        </Link>
        <Link href="/plataformas" className="flex">
          <Card className="flex flex-1 flex-col justify-center gap-0.5 hover:border-border-strong">
            <span className={`text-xl font-bold ${dados.creditosBaixos ? "text-danger" : dados.saldoCreditos > 0 ? "text-accent" : "text-text-dim"}`}>
              {dados.saldoCreditos}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Créditos</span>
          </Card>
        </Link>
      </div>

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
                  <Link href={`/clientes/${cliente.id}`} className="truncate text-sm font-semibold text-text hover:text-accent">
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
