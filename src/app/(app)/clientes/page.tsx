import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl0, dataCurta, fmtTelefone } from "@/lib/format";
import { PLANO_LABEL, diasParaVencer, faixaVencimento } from "@/lib/planos";
import { Avatar, Badge, Button, Card, EmptyState, cx } from "@/components/ui";
import { cobradosHojePorCliente } from "@/lib/cobrancas";
import { RenovarBotao } from "./renovar-em-lote/renovar-botao";
import { CobrarBotao } from "./cobrar-botao";
import { InteressadoItem } from "../interessados/interessado-item";
import { PainelDetalhe, PainelVazio } from "./painel-detalhe";

const ABAS = [
  { chave: "todos", label: "Todos" },
  { chave: "ativos", label: "Ativos" },
  { chave: "atencao", label: "Precisa de atenção" },
  { chave: "cancelados", label: "Cancelados" },
  { chave: "interessados", label: "Interessados" },
] as const;

type Tom = "neutral" | "danger" | "warning" | "success";

function estadoCliente(status: string, vencimento: Date): { tom: Tom; label: string } {
  if (status === "CANCELADO") return { tom: "neutral", label: "Cancelado" };
  const faixa = faixaVencimento(vencimento);
  if (faixa === "VENCIDO") return { tom: "danger", label: "Vencido" };
  if (faixa === "ATE_5_DIAS") return { tom: "warning", label: "Vencendo" };
  return { tom: "success", label: "Em dia" };
}

function diasTexto(vencimento: Date): string {
  const dias = diasParaVencer(vencimento);
  return dias < 0 ? `${Math.abs(dias)}d atrás` : `em ${dias}d`;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; id?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { aba = "ativos", id: selecionadoId } = await searchParams;

  const [clientes, cobradosHoje, interessados, clienteSelecionado] = await Promise.all([
    prisma.cliente.findMany({
      where: { revendedorId: revendedor.id },
      include: { servico: true },
      orderBy: { vencimento: "asc" },
    }),
    cobradosHojePorCliente(revendedor.id),
    aba === "interessados"
      ? prisma.interessadoCliente.findMany({
          where: { revendedorId: revendedor.id, convertido: false },
          orderBy: [{ retornarEm: "asc" }, { criadoEm: "desc" }],
        })
      : Promise.resolve([]),
    selecionadoId
      ? prisma.cliente.findUnique({
          where: { id: selecionadoId, revendedorId: revendedor.id },
          include: { servico: true, renovacoes: { orderBy: { data: "desc" } }, vendas: true },
        })
      : Promise.resolve(null),
  ]);

  const filtrados = clientes.filter((c) => {
    if (aba === "cancelados") return c.status === "CANCELADO";
    if (c.status === "CANCELADO") return false;
    if (aba === "atencao") {
      const faixa = faixaVencimento(c.vencimento);
      return faixa === "VENCIDO" || faixa === "ATE_5_DIAS";
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Clientes</h1>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Link href="/clientes/cobrar-em-lote">
            <Button variant="ghost" className="w-full sm:w-auto">Cobrar em lote</Button>
          </Link>
          <Link href="/clientes/renovar-em-lote">
            <Button variant="ghost" className="w-full sm:w-auto">Renovar em lote</Button>
          </Link>
          <Link href="/clientes/aviso-em-massa">
            <Button variant="ghost" className="w-full sm:w-auto">Aviso em massa</Button>
          </Link>
          <Link href="/clientes/novo">
            <Button className="w-full sm:w-auto">+ Novo cliente</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border-strong p-1 text-sm">
        {ABAS.map((item) => (
          <Link
            key={item.chave}
            href={`/clientes?aba=${item.chave}`}
            className={cx(
              "whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold",
              aba === item.chave ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {aba === "interessados" ? (
        interessados.length === 0 ? (
          <EmptyState>Nenhum interessado cadastrado ainda.</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {interessados.map((lead) => (
              <InteressadoItem key={lead.id} lead={lead} />
            ))}
          </div>
        )
      ) : filtrados.length === 0 ? (
        <EmptyState>Nenhum cliente nesta lista ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          <Card className="min-w-0 flex-1 p-0">
            {/* Desktop largo: tabela no padrão do app original (Cliente / WhatsApp / Plano · App / Vencimento / Valor / Status / Cobrar).
                Só a partir de xl (1280px) — em telas menores o painel lateral fixo (360px) não sobra espaço
                suficiente pras colunas em fr não encolherem abaixo do conteúdo e a linha vazava pra fora do cartão. */}
            <div className="hidden xl:grid xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_220px] xl:gap-3 xl:border-b xl:border-border xl:px-4 xl:py-2 xl:text-[11px] xl:font-semibold xl:uppercase xl:tracking-wider xl:text-text-dim">
              <span className="truncate">Cliente</span>
              <span className="truncate">WhatsApp</span>
              <span className="truncate">Plano · App</span>
              <span className="truncate">Vence</span>
              <span className="truncate">Valor</span>
              <span className="truncate">Status</span>
              <span />
            </div>
            <div className="flex flex-col divide-y divide-border">
              {filtrados.map((cliente) => {
                const estado = estadoCliente(cliente.status, cliente.vencimento);
                const ativo = cliente.id === selecionadoId;

                return (
                  <div
                    key={cliente.id}
                    className={cx(
                      "xl:grid xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_220px] xl:items-center xl:gap-3 xl:px-4 xl:py-3 xl:hover:bg-surface-2",
                      ativo ? "xl:bg-accent-soft/40" : ""
                    )}
                  >
                    {/* Desktop largo (xl+) */}
                    <Link href={`/clientes?aba=${aba}&id=${cliente.id}`} scroll={false} className="hidden min-w-0 items-center gap-3 xl:flex">
                      <Avatar nome={cliente.nome} size={32} />
                      <span className="truncate text-sm font-semibold text-text">{cliente.nome}</span>
                    </Link>
                    <span className="hidden truncate text-xs text-text-muted xl:block">{fmtTelefone(cliente.whatsapp)}</span>
                    <span className="hidden truncate text-xs text-text-muted xl:block">
                      {PLANO_LABEL[cliente.plano]} · {cliente.servico?.nome ?? "—"}
                    </span>
                    <div className="hidden xl:flex xl:flex-col">
                      <span className="text-sm font-semibold text-text">{dataCurta(cliente.vencimento)}</span>
                      <span className="text-[11px] text-text-dim">{diasTexto(cliente.vencimento)}</span>
                    </div>
                    <span className="hidden text-sm font-semibold text-money xl:block">{brl0(cliente.valorPlano)}</span>
                    <span className="hidden xl:block">
                      <Badge tone={estado.tom}>{estado.label}</Badge>
                    </span>
                    <span className="hidden xl:flex xl:gap-1.5">
                      {cliente.status !== "CANCELADO" ? (
                        <>
                          {cliente.whatsapp ? (
                            <CobrarBotao clienteId={cliente.id} cobradoEm={cobradosHoje.get(cliente.id) ?? null} className="min-w-0 flex-1" />
                          ) : null}
                          <RenovarBotao clienteId={cliente.id} className="min-w-0 flex-1" />
                        </>
                      ) : (
                        <RenovarBotao clienteId={cliente.id} className="min-w-0 flex-1" label="Reativar" labelFeito="Reativado ✓" />
                      )}
                    </span>

                    {/* Telas menores (até lg, inclui tablet/notebook estreito): card empilhado */}
                    <div className="flex flex-col gap-2 px-4 py-3 xl:hidden">
                      <Link href={`/clientes/${cliente.id}`} className="flex items-center gap-3">
                        <Avatar nome={cliente.nome} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text">{cliente.nome}</p>
                          <p className="truncate text-xs text-text-dim">
                            {PLANO_LABEL[cliente.plano]} · {cliente.servico?.nome ?? "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-text">{brl0(cliente.valorPlano)}</span>
                          <Badge tone={estado.tom}>{estado.label}</Badge>
                        </div>
                      </Link>
                      {cliente.status !== "CANCELADO" ? (
                        <div className="flex gap-2 pl-12">
                          {cliente.whatsapp ? (
                            <CobrarBotao clienteId={cliente.id} cobradoEm={cobradosHoje.get(cliente.id) ?? null} className="min-w-0 flex-1" />
                          ) : null}
                          <RenovarBotao clienteId={cliente.id} className="min-w-0 flex-1" />
                        </div>
                      ) : (
                        <div className="flex gap-2 pl-12">
                          <RenovarBotao clienteId={cliente.id} className="min-w-0 flex-1" label="Reativar" labelFeito="Reativado ✓" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <div className="hidden xl:block xl:w-[360px] xl:shrink-0">
            {clienteSelecionado ? (
              <PainelDetalhe cliente={clienteSelecionado} cobradoHoje={cobradosHoje.get(clienteSelecionado.id) ?? null} />
            ) : (
              <PainelVazio />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
