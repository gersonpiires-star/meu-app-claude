import Link from "next/link";
import { exigirRevendedor, permissoesFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dadosPlataformas } from "@/lib/plataformas";
import { limitesDoMes } from "@/lib/dados";
import { brl, brl0, dataCurta } from "@/lib/format";
import { Badge, Card, EmptyState, StatTile, cx } from "@/components/ui";
import { IconCamadas } from "@/components/nav-icons";
import { NovaPlataformaForm } from "./nova-plataforma-form";
import { NovoAppForm } from "./novo-app-form";
import { LoteForm } from "./lote-form";
import { LoteItem } from "./lote-item";
import { ServicoItem } from "./servico-item";
import { ExcluirPlataformaBotao } from "./excluir-plataforma-botao";
import { EditarPlataformaForm } from "./editar-plataforma-form";
import { adicionarLote, editarLote, criarAppNaPlataforma, editarPlataforma } from "./actions";

const IconGasto = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 6.5v7M7.5 8.3c0-1 .9-1.8 2.5-1.8s2.5.7 2.5 1.6c0 2.2-5 .9-5 3 0 1 1 1.7 2.5 1.7s2.5-.7 2.5-1.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconClientes = (
  <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
    <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M2.5 16c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="14" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M13 12.3c1.9.4 3.5 1.6 3.5 3.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default async function PlataformasPage() {
  const revendedor = await exigirRevendedor();
  const { inicio, fim } = limitesDoMes();

  const [plataformas, servicosSemPlataforma, { podeExcluir }] = await Promise.all([
    dadosPlataformas(revendedor.id),
    prisma.servico.findMany({
      where: { revendedorId: revendedor.id, plataformaId: null },
      include: { _count: { select: { clientes: true } } },
      orderBy: { nome: "asc" },
    }),
    permissoesFuncionario(),
  ]);

  const listaPlataformas = plataformas.map((p) => ({ id: p.id, nome: p.nome }));

  if (plataformas.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-text">Plataformas</h1>
            <p className="text-xs text-text-dim">Fornecedores de créditos e os apps que você revende com eles</p>
          </div>
          <NovaPlataformaForm />
        </div>
        <EmptyState>Nenhuma plataforma cadastrada ainda.</EmptyState>
      </div>
    );
  }

  const creditosTotais = plataformas.reduce((a, p) => a + p.saldo, 0);
  const gastoMes = plataformas.reduce(
    (a, p) => a + p.lotes.filter((l) => l.data >= inicio && l.data < fim).reduce((s, l) => s + l.valorPago, 0),
    0
  );
  const clientesAtivos = plataformas.reduce((a, p) => a + p.servicos.reduce((s, sv) => s + sv._count.clientes, 0), 0);
  const clientesPorPlataforma = plataformas
    .map((p) => `${p.servicos.reduce((s, sv) => s + sv._count.clientes, 0)} no ${p.nome}`)
    .join(" · ");

  const plataformaIds = plataformas.map((p) => p.id);
  const renovacoesRecentes = await prisma.renovacao.findMany({
    where: { servico: { plataformaId: { in: plataformaIds } } },
    include: { cliente: { select: { nome: true } }, servico: { select: { plataforma: { select: { nome: true } } } } },
    orderBy: { data: "desc" },
    take: 8,
  });

  const historico = [
    ...plataformas.flatMap((p) =>
      p.lotes.map((l) => ({
        id: `l-${l.id}`,
        data: l.data,
        label: "Recarga de créditos",
        plataforma: p.nome,
        qtd: l.quantidade,
        valor: brl(l.valorPago),
        positivo: true,
      }))
    ),
    ...renovacoesRecentes.map((r) => ({
      id: `r-${r.id}`,
      data: r.data,
      label: `Renovação · ${r.cliente.nome}`,
      plataforma: r.servico?.plataforma?.nome ?? "—",
      qtd: -1,
      valor: "—",
      positivo: false,
    })),
  ]
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Plataformas</h1>
          <p className="text-xs text-text-dim">Fornecedores de créditos e os apps que você revende com eles</p>
        </div>
        <NovaPlataformaForm />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Créditos totais" value={String(creditosTotais)} sub="somando as plataformas" icon={<IconCamadas className="h-3.5 w-3.5" />} />
        <StatTile label="Gasto com créditos (mês)" value={brl0(gastoMes)} tone="money" icon={IconGasto} />
        <StatTile label="Clientes ativos" value={String(clientesAtivos)} sub={clientesPorPlataforma} icon={IconClientes} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {plataformas.map((p) => {
          const baixo = p.saldo <= p.minimo;
          const ultimaRecarga = [...p.lotes].sort((a, b) => b.data.getTime() - a.data.getTime())[0];
          return (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cx(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      baixo ? "bg-danger-bg text-danger" : "bg-accent-soft text-accent"
                    )}
                  >
                    <IconCamadas className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-text">{p.nome}</p>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-text-dim hover:text-accent hover:underline">
                        {p.url.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <p className="text-xs text-text-dim">Sem link do painel</p>
                    )}
                  </div>
                </div>
                <Badge tone={baixo ? "warning" : "success"}>{baixo ? "Pouco crédito" : "Ativa"}</Badge>
              </div>

              <div className="flex flex-col divide-y divide-border border-y border-border text-sm">
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-dim">Créditos disponíveis</span>
                  <span className="font-semibold text-text">{p.saldo}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-dim">Custo por crédito</span>
                  <span className="font-semibold text-text">{brl(p.custoMedio)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-dim">Clientes nesta plataforma</span>
                  <span className="font-semibold text-text">{p.servicos.reduce((a, s) => a + s._count.clientes, 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-dim">Última recarga</span>
                  <span className="font-semibold text-text">{ultimaRecarga ? dataCurta(ultimaRecarga.data) : "—"}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <LoteForm acao={adicionarLote.bind(null, p.id)} label="Recarregar" variant="primary" />
                  {p.url ? (
                    <a href={p.url} target="_blank" rel="noopener noreferrer">
                      <span className="inline-flex items-center rounded-xl border border-border-strong px-3.5 py-2.5 text-sm font-semibold text-text transition hover:bg-surface-2">
                        Abrir painel
                      </span>
                    </a>
                  ) : null}
                </div>
                <EditarPlataformaForm plataforma={{ nome: p.nome, url: p.url, minimo: p.minimo }} acao={editarPlataforma.bind(null, p.id)} />
              </div>
            </Card>
          );
        })}

        <Link
          href="#gerenciar-plataformas"
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong p-8 text-center text-text-dim transition hover:border-accent-strong hover:text-accent"
        >
          <span className="text-2xl">+</span>
          <span className="text-sm font-semibold">Adicionar plataforma</span>
          <span className="text-xs">Use o botão &ldquo;Nova plataforma&rdquo; no topo</span>
        </Link>
      </div>

      {historico.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Histórico de créditos</h2>
          <div className="flex flex-col divide-y divide-border">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="text-text-dim">{dataCurta(h.data)}</span>
                <span className="flex-1 truncate text-text-muted">{h.label}</span>
                <span className="text-xs text-text-dim">{h.plataforma}</span>
                <span className={cx("font-semibold", h.positivo ? "text-accent" : "text-danger")}>
                  {h.positivo ? "+" : ""}
                  {h.qtd}
                </span>
                <span className="w-20 text-right text-xs text-text-dim">{h.valor}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div id="gerenciar-plataformas" className="flex flex-col gap-3 scroll-mt-4">
        <h2 className="text-sm font-bold text-text">Gerenciar apps e lotes</h2>
        {plataformas.map((p) => {
          const baixo = p.saldo <= p.minimo;
          return (
            <details key={p.id} className="group rounded-2xl border border-border bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-semibold text-text">{p.nome}</span>
                <div className="flex items-center gap-2">
                  {baixo ? <Badge tone="warning">Saldo baixo</Badge> : null}
                  <Badge tone={baixo ? "danger" : "accent"}>Saldo: {p.saldo}</Badge>
                  {podeExcluir ? <ExcluirPlataformaBotao id={p.id} nome={p.nome} /> : null}
                </div>
              </summary>
              <div className="flex flex-col gap-3 border-t border-border p-4">
                {p.lotes.length > 0 ? (
                  <div className="flex flex-col divide-y divide-border">
                    {[...p.lotes]
                      .sort((a, b) => b.data.getTime() - a.data.getTime())
                      .map((l) => (
                        <LoteItem key={l.id} lote={l} acao={editarLote} podeEditar={podeExcluir} />
                      ))}
                  </div>
                ) : null}
                <div className="border-t border-border pt-3">
                  <LoteForm acao={adicionarLote.bind(null, p.id)} />
                </div>
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Apps dessa plataforma</p>
                  {p.servicos.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {p.servicos.map((s) => (
                        <ServicoItem
                          key={s.id}
                          servico={{
                            id: s.id,
                            nome: s.nome,
                            plataformaId: s.plataformaId,
                            custoCredito: s.custoCredito,
                            cobrancaTelaExtra: s.cobrancaTelaExtra,
                            totalClientes: s._count.clientes,
                          }}
                          plataformas={listaPlataformas}
                          podeExcluir={podeExcluir}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mb-2 text-sm text-text-dim">Nenhum app vinculado ainda.</p>
                  )}
                  <div className="mt-2">
                    <NovoAppForm acao={criarAppNaPlataforma.bind(null, p.id)} />
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {servicosSemPlataforma.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Apps sem plataforma — vincule pra controlar o crédito
          </p>
          <div className="flex flex-col gap-2">
            {servicosSemPlataforma.map((s) => (
              <ServicoItem
                key={s.id}
                servico={{
                  id: s.id,
                  nome: s.nome,
                  plataformaId: s.plataformaId,
                  custoCredito: s.custoCredito,
                  cobrancaTelaExtra: s.cobrancaTelaExtra,
                  totalClientes: s._count.clientes,
                }}
                plataformas={listaPlataformas}
                podeExcluir={podeExcluir}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
