import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { dadosVendasMes, mesReferenciaAtual, receitaUltimosMeses } from "@/lib/vendas";
import { brl, dataCurta } from "@/lib/format";
import { linkWhatsApp } from "@/lib/mensagens";
import { Badge, Button, Card, EmptyState, StatTile, TrendChip, cx } from "@/components/ui";
import { CompartilharRecibo } from "@/components/compartilhar-recibo";
import { BaixarRecibo } from "@/components/baixar-recibo";
import { prisma } from "@/lib/prisma";
import { vincularClienteVenda } from "./actions";
import { VincularCliente } from "./vincular-cliente";

const MESES_NOME = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const ABAS = [
  { chave: "todas", label: "Todas" },
  { chave: "renovacoes", label: "Renovações" },
  { chave: "aparelhos", label: "Aparelhos" },
] as const;

const IconSacola = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M5.5 7h9l.8 9.5a1.5 1.5 0 0 1-1.5 1.6H6.2a1.5 1.5 0 0 1-1.5-1.6L5.5 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M7.5 7V5.5a2.5 2.5 0 0 1 5 0V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconMoeda = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.5v7M7.8 8.3c0-1 .9-1.8 2.2-1.8s2.2.6 2.2 1.5c0 2-4.4 1-4.4 3 0 .9 1 1.5 2.2 1.5s2.2-.7 2.2-1.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IconMenosMoeda = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.5 10h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const IconTendencia = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M3 13.5l4.5-4.5 3 3L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.5 5H17v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconTicket = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <path d="M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1.3 1.3 0 0 0 0 2v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1.3 1.3 0 0 0 0-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 6.5v7" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.6 1.6" strokeLinecap="round" />
  </svg>
);

function mensagemRecibo(nome: string, produto: string, valor: number): string {
  return `Olá ${nome}, tudo bem?\n\nSegue o comprovante da compra do seu ${produto}! 📱\n\nValor: ${brl(valor)}\n\nQualquer dúvida, é só me chamar aqui.`;
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ recibo?: string; aba?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { recibo, aba: abaParam } = await searchParams;
  const aba = ABAS.find((a) => a.chave === abaParam)?.chave ?? "todas";
  const { ano, mes } = mesReferenciaAtual();

  const [dados, ultimosMeses, vendaComReciboPendente, clientesParaVincular] = await Promise.all([
    dadosVendasMes(revendedor.id, ano, mes),
    receitaUltimosMeses(revendedor.id, 3),
    recibo
      ? prisma.venda.findUnique({ where: { id: recibo }, include: { produto: true, cliente: true } })
      : Promise.resolve(null),
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const mesAtualIdx = ultimosMeses.length - 1;
  const mesAnterior = ultimosMeses[mesAtualIdx - 1];
  const variacaoPct = mesAnterior && mesAnterior.receita > 0 ? ((dados.receita - mesAnterior.receita) / mesAnterior.receita) * 100 : 0;

  const linhasFiltradas =
    aba === "renovacoes"
      ? dados.linhas.filter((l) => l.tipo === "RENOVACAO")
      : aba === "aparelhos"
        ? dados.linhas.filter((l) => l.tipo === "APARELHO")
        : dados.linhas;

  const totalPorFormaPagamento = dados.formasPagamento.reduce((a, f) => a + f.valor, 0);
  const maiorMesSaldo = Math.max(...ultimosMeses.map((m) => m.receita), 1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Vendas</h1>
          <p className="text-xs text-text-dim">Tudo o que entrou: renovações e aparelhos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl border border-border-strong px-3 py-2 text-sm font-semibold capitalize text-text-dim">
            {MESES_NOME[mes]} {ano}
          </span>
          <Link href="/vendas/nova">
            <Button>+ Nova venda</Button>
          </Link>
        </div>
      </div>

      {vendaComReciboPendente?.cliente ? (
        <Card className="flex flex-col gap-2 border-accent-strong bg-accent-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text">
              Venda pra <strong>{vendaComReciboPendente.cliente.nome}</strong> registrada — já dá pra emitir o recibo.
            </p>
            <div className="flex flex-wrap gap-2">
              <BaixarRecibo
                reciboUrl={`/api/vendas/${vendaComReciboPendente.id}/recibo`}
                nomeArquivo={`recibo-${vendaComReciboPendente.cliente.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`}
              />
              {vendaComReciboPendente.cliente.whatsapp ? (
                <a
                  href={linkWhatsApp(
                    vendaComReciboPendente.cliente.whatsapp,
                    mensagemRecibo(
                      vendaComReciboPendente.cliente.nome,
                      vendaComReciboPendente.produto.modelo,
                      vendaComReciboPendente.quantidade * vendaComReciboPendente.valorUnitario
                    )
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="whatsapp">Enviar no WhatsApp</Button>
                </a>
              ) : null}
              <CompartilharRecibo
                reciboUrl={`/api/vendas/${vendaComReciboPendente.id}/recibo`}
                nomeArquivo={`recibo-${vendaComReciboPendente.cliente.nome.replace(/\s+/g, "-").toLowerCase()}.pdf`}
                mensagem={mensagemRecibo(
                  vendaComReciboPendente.cliente.nome,
                  vendaComReciboPendente.produto.modelo,
                  vendaComReciboPendente.quantidade * vendaComReciboPendente.valorUnitario
                )}
              />
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Vendas no mês"
          value={String(dados.vendasNoMes)}
          sub={`${dados.qtdRenovacoes} renovaç${dados.qtdRenovacoes === 1 ? "ão" : "ões"} · ${dados.qtdAparelhos} aparelho${dados.qtdAparelhos === 1 ? "" : "s"}`}
          icon={IconSacola}
        />
        <StatTile
          label="Receita"
          value={brl(dados.receita)}
          sub={mesAnterior ? undefined : "neste mês"}
          tone="money"
          icon={IconMoeda}
        />
        <StatTile label="Custo" value={brl(dados.custo)} sub="créditos + aparelhos" tone="danger" icon={IconMenosMoeda} />
        <StatTile label="Lucro" value={brl(dados.lucro)} sub={`margem de ${dados.margem.toFixed(0)}%`} tone="accent" icon={IconTendencia} />
        <StatTile label="Ticket médio" value={brl(dados.ticketMedio)} sub="por venda" icon={IconTicket} />
      </div>
      {mesAnterior ? (
        <div className="-mt-3">
          <TrendChip pct={variacaoPct} sufixo={`vs ${MESES_NOME[mesAnterior.mes].slice(0, 3)}`} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <h2 className="text-sm font-bold text-text">Vendas de {MESES_NOME[mes]}</h2>
            <div className="flex gap-1 rounded-xl border border-border-strong p-1 text-xs">
              {ABAS.map((a) => {
                const qtd = a.chave === "todas" ? dados.vendasNoMes : a.chave === "renovacoes" ? dados.qtdRenovacoes : dados.qtdAparelhos;
                return (
                  <Link
                    key={a.chave}
                    href={`/vendas?aba=${a.chave}`}
                    className={cx(
                      "whitespace-nowrap rounded-lg px-2.5 py-1.5 font-semibold",
                      aba === a.chave ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
                    )}
                  >
                    {a.label} · {qtd}
                  </Link>
                );
              })}
            </div>
          </div>

          {linhasFiltradas.length === 0 ? (
            <div className="p-4">
              <EmptyState>Nenhuma venda nessa categoria neste mês.</EmptyState>
            </div>
          ) : (
            <>
              <div className="flex min-w-[560px] items-center gap-3 border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
                <span className="w-12 shrink-0">Data</span>
                <span className="min-w-0 flex-1">Cliente</span>
                <span className="w-[130px] shrink-0">Pagamento</span>
                <span className="w-[84px] shrink-0 text-right">Valor</span>
                <span className="w-[84px] shrink-0 text-right">Custo</span>
                <span className="w-[84px] shrink-0 text-right">Lucro</span>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {linhasFiltradas.map((linha) => (
                  <div key={`${linha.tipo}-${linha.id}`} className="flex min-w-[560px] items-center gap-3 px-4 py-3 text-sm">
                    <span className="w-12 shrink-0 text-text-dim">{dataCurta(linha.data)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate font-semibold text-text">{linha.clienteNome}</p>
                        <Badge tone={linha.combo ? "accent" : linha.tipo === "RENOVACAO" ? "neutral" : "warning"}>
                          {linha.combo ? "Combo" : linha.tipo === "RENOVACAO" ? "Renovação" : "Aparelho"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-text-dim">{linha.detalhe}</p>
                      {linha.tipo === "APARELHO" && !linha.combo && !linha.clienteId ? (
                        <div className="mt-1">
                          <VincularCliente vendaId={linha.id} clientes={clientesParaVincular} acao={vincularClienteVenda} />
                        </div>
                      ) : null}
                    </div>
                    <span className="w-[130px] shrink-0 truncate text-text-muted">{linha.pagamento}</span>
                    <span className="w-[84px] shrink-0 text-right font-semibold text-money">{brl(linha.valor)}</span>
                    <span className="w-[84px] shrink-0 text-right text-danger">− {brl(linha.custo)}</span>
                    <span className="w-[84px] shrink-0 text-right font-semibold text-accent">{brl(linha.lucro)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-text">Por mês</h2>
            </div>
            <div className="flex flex-col gap-3">
              {[...ultimosMeses].reverse().map((m, i) => (
                <div key={`${m.ano}-${m.mes}`} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">
                      {MESES_NOME[m.mes][0].toUpperCase() + MESES_NOME[m.mes].slice(1)}
                      {i === 0 ? " (parcial)" : ""}
                    </span>
                    <span className="font-semibold text-text">{brl(m.receita)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.max(3, (m.receita / maiorMesSaldo) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link href="/relatorio" className="mt-3 block text-xs font-semibold text-accent hover:underline">
              Ver relatório completo →
            </Link>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Formas de pagamento</h2>
            {dados.formasPagamento.length === 0 ? (
              <p className="text-sm text-text-dim">Nenhuma venda neste mês.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {dados.formasPagamento.map((f) => (
                  <div key={f.forma} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-muted">{f.forma}</span>
                      <span className="font-semibold text-text">{brl(f.valor)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(3, (f.valor / totalPorFormaPagamento) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
