import Link from "next/link";
import { brl, brl0, dataCurta, fmtTelefone } from "@/lib/format";
import { PLANO_LABEL, diasParaVencer, faixaVencimento } from "@/lib/planos";
import { Avatar, Badge, Card, EmptyState, cx } from "@/components/ui";
import { CobrarBotao } from "./cobrar-botao";
import { RenovarBotao } from "./renovar-em-lote/renovar-botao";
import type { Cliente, Renovacao, Servico, Venda } from "@/generated/prisma/client";

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
  return dias < 0 ? `${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} atrás` : `em ${dias} dia${dias === 1 ? "" : "s"}`;
}

function Campo({ label, value, tom = "neutral" as Tom }: { label: string; value: string; tom?: Tom }) {
  const cor = tom === "danger" ? "text-danger" : tom === "warning" ? "text-warning" : "text-text";
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-text-dim">{label}</span>
      <span className={cx("truncate font-semibold", cor)}>{value}</span>
    </div>
  );
}

type ClienteDetalhe = Cliente & {
  servico: Servico | null;
  renovacoes: Renovacao[];
  vendas: Venda[];
};

export function PainelDetalhe({ cliente, cobradoHoje }: { cliente: ClienteDetalhe; cobradoHoje: Date | null }) {
  const estado = estadoCliente(cliente.status, cliente.vencimento);
  const cancelado = cliente.status === "CANCELADO";
  const totalPago = cliente.renovacoes.reduce((a, r) => a + r.valor, 0) + cliente.vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar nome={cliente.nome} size={44} />
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-text">{cliente.nome}</h2>
            <Badge tone={estado.tom}>{estado.label}</Badge>
          </div>
        </div>
        <Link
          href={`/clientes/${cliente.id}/editar`}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-text-dim hover:bg-surface-2 hover:text-text"
        >
          Editar
        </Link>
      </div>

      {!cancelado ? (
        <div className="flex gap-2">
          {cliente.whatsapp ? (
            <CobrarBotao clienteId={cliente.id} cobradoEm={cobradoHoje} variant="whatsapp" className="flex-1" />
          ) : null}
          <RenovarBotao clienteId={cliente.id} className="flex-1" />
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-border border-y border-border">
        {cliente.whatsapp ? <Campo label="WhatsApp" value={fmtTelefone(cliente.whatsapp)} /> : null}
        <Campo label="Plano" value={`${PLANO_LABEL[cliente.plano]} · ${brl0(cliente.valorPlano)}`} />
        {!cancelado ? (
          <Campo
            label={diasParaVencer(cliente.vencimento) < 0 ? "Venceu em" : "Vence em"}
            value={`${dataCurta(cliente.vencimento)} · ${diasTexto(cliente.vencimento)}`}
            tom={estado.tom === "danger" ? "danger" : estado.tom === "warning" ? "warning" : "neutral"}
          />
        ) : null}
        {cliente.servico ? <Campo label="Plataforma" value={cliente.servico.nome} /> : null}
        <Campo label="Telas" value={`${cliente.telas} tela${cliente.telas === 1 ? "" : "s"}`} />
        <Campo label="Cliente desde" value={dataCurta(cliente.criadoEm)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Histórico</span>
          <span className="text-xs font-semibold text-accent">{totalPago > 0 ? `${brl(totalPago)} no total` : ""}</span>
        </div>
        {cliente.renovacoes.length === 0 ? (
          <p className="text-xs text-text-dim">Nenhuma renovação registrada ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {cliente.renovacoes.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-text-muted">Renovação — {PLANO_LABEL[r.plano]}</p>
                  <p className="text-[11px] text-text-dim">{dataCurta(r.data)}</p>
                </div>
                <span className="shrink-0 font-semibold text-money">{brl0(r.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href={`/clientes/${cliente.id}`} className="text-center text-xs font-semibold text-accent hover:underline">
        Ver cliente completo →
      </Link>
    </Card>
  );
}

export function PainelVazio() {
  return (
    <Card className="p-4">
      <EmptyState>Clique em um cliente na lista para ver os detalhes aqui.</EmptyState>
    </Card>
  );
}
