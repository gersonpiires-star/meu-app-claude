import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { dadosPainel } from "@/lib/dados";
import { brl, brl0, dataCurta } from "@/lib/format";
import { PLANO_LABEL } from "@/lib/planos";
import { linkWhatsApp, MODELOS_COBRANCA, preencherModelo } from "@/lib/mensagens";
import { Badge, Button, Card, EmptyState, StatTile } from "@/components/ui";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function PainelPage() {
  const revendedor = await exigirRevendedor();
  const dados = await dadosPainel(revendedor.id);

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

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Entrou no mês
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Renovações" value={brl0(dados.receitaRecorrente)} tone="accent" />
          <StatTile label="Produtos" value={brl0(dados.receitaApar)} tone="accent" />
          <StatTile label="Custo" value={"− " + brl0(dados.custoTotal)} tone="danger" />
          <StatTile
            label="Lucro"
            value={brl0(dados.lucro)}
            sub={`Previsto p/ ${MESES[dados.proximoMes.getMonth()]}: ${brl0(dados.previstoProxMes)}`}
            tone="accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Clientes ativos" value={String(dados.ativos)} />
        <StatTile label="Vencendo" value={String(dados.vencendo.length)} tone="warning" />
        <StatTile label="Vencidos" value={String(dados.vencidos.length)} tone="danger" />
      </div>

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
            {[...dados.vencidos, ...dados.vencendo].map((cliente) => {
              const vencido = cliente.vencimento < new Date();
              const mensagem = preencherModelo(MODELOS_COBRANCA[vencido ? "Vencido" : "Lembrete"], {
                nome: cliente.nome,
                app: cliente.servico?.nome ?? "",
                plano: PLANO_LABEL[cliente.plano],
                vencimento: dataCurta(cliente.vencimento),
                prazo: vencido ? "vencido" : "a vencer",
                valor: brl(cliente.valorPlano),
              });
              return (
                <div key={cliente.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/clientes/${cliente.id}`} className="truncate text-sm font-semibold text-text hover:text-accent">
                      {cliente.nome}
                    </Link>
                    <p className="text-xs text-text-dim">
                      {PLANO_LABEL[cliente.plano]} · vence {dataCurta(cliente.vencimento)}
                    </p>
                  </div>
                  {cliente.whatsapp ? (
                    <a href={linkWhatsApp(cliente.whatsapp, mensagem)} target="_blank" rel="noreferrer">
                      <Button variant="whatsapp" className="whitespace-nowrap">
                        Cobrar agora
                      </Button>
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
