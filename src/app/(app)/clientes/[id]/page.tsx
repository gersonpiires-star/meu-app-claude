import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl, dataPorExtenso, iniciais } from "@/lib/format";
import { PLANO_LABEL, faixaVencimento } from "@/lib/planos";
import { Badge, Button, Card } from "@/components/ui";
import { renovarCliente, cancelarCliente, excluirCliente } from "../actions";
import { RenovarForm } from "./renovar-form";
import { MensagemWhatsApp } from "./mensagem-whatsapp";
import { CancelarForm } from "./cancelar-form";
import { ExcluirBotao } from "./excluir-botao";
import { LinkPagamento } from "./link-pagamento";

function tempoDeCasa(desde: Date, ate: Date = new Date()): string {
  const meses = Math.max(
    0,
    (ate.getFullYear() - desde.getFullYear()) * 12 + (ate.getMonth() - desde.getMonth())
  );
  if (meses < 1) {
    const dias = Math.max(0, Math.round((ate.getTime() - desde.getTime()) / 86400000));
    return `${dias} dia${dias === 1 ? "" : "s"}`;
  }
  if (meses < 12) return `${meses} mês${meses === 1 ? "" : "es"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto ? `${anos}a ${resto}m` : `${anos} ano${anos === 1 ? "" : "s"}`;
}

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const revendedor = await exigirRevendedor();
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id, revendedorId: revendedor.id },
    include: { servico: true, renovacoes: { orderBy: { data: "desc" } } },
  });
  if (!cliente) notFound();

  const faixa = faixaVencimento(cliente.vencimento);
  const jaRendeu = cliente.renovacoes.reduce((a, r) => a + r.valor, 0);
  const cancelado = cliente.status === "CANCELADO";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href="/clientes" className="text-xs font-semibold text-text-dim hover:text-text">
          ‹ Clientes
        </Link>
        {!cancelado ? (
          <div className="flex gap-2">
            <Link href={`/clientes/${id}/editar`}>
              <Button variant="ghost">Editar</Button>
            </Link>
            <ExcluirBotao acao={excluirCliente.bind(null, id)} />
          </div>
        ) : null}
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
            {iniciais(cliente.nome)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-text">{cliente.nome}</h1>
            <p className="truncate text-xs text-text-dim">{cliente.whatsapp ?? "sem WhatsApp cadastrado"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cancelado ? (
            <Badge tone="neutral">Saiu em {cliente.motivoSaidaData ? dataPorExtenso(cliente.motivoSaidaData) : "—"}</Badge>
          ) : cliente.testeGratis ? (
            <Badge tone="warning">Cliente em teste grátis</Badge>
          ) : cliente.renovacoes.length === 0 ? (
            <Badge tone="accent">Cliente novo</Badge>
          ) : (
            <Badge tone={faixa === "VENCIDO" ? "danger" : faixa === "ATE_5_DIAS" ? "warning" : "success"}>
              {faixa === "VENCIDO" ? "Vencido" : faixa === "ATE_5_DIAS" ? "Vencendo" : "Em dia"}
            </Badge>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Próximo vencimento</p>
            <p className="mt-0.5 font-semibold text-text">{dataPorExtenso(cliente.vencimento)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Cliente há</p>
            <p className="mt-0.5 font-semibold text-text">{tempoDeCasa(cliente.criadoEm)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Telas</p>
            <p className="mt-0.5 font-semibold text-text">{cliente.telas}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Serviço</p>
            <p className="mt-0.5 font-semibold text-text">{cliente.servico?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Plano</p>
            <p className="mt-0.5 font-semibold text-text">{PLANO_LABEL[cliente.plano]} · {brl(cliente.valorPlano)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Já rendeu</p>
            <p className="mt-0.5 font-semibold text-accent">{brl(jaRendeu)}</p>
          </div>
        </div>

        {cliente.anotacao ? (
          <div className="mt-4 rounded-lg bg-surface-2 p-3 text-sm text-text-muted">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Anotação</p>
            <p className="mt-1">{cliente.anotacao}</p>
          </div>
        ) : null}
      </Card>

      {!cancelado ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Renovação</h2>
          <RenovarForm acao={renovarCliente.bind(null, id)} planoAtual={cliente.plano} valorAtual={cliente.valorPlano} />
          <div className="mt-3 border-t border-border pt-3">
            <LinkPagamento clienteId={id} whatsapp={cliente.whatsapp} />
            <p className="mt-2 text-xs text-text-dim">
              Quando o cliente pagar, a renovação é registrada automaticamente.
            </p>
          </div>
        </Card>
      ) : null}

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Falar com o cliente</h2>
        <MensagemWhatsApp
          whatsapp={cliente.whatsapp}
          dados={{
            nome: cliente.nome,
            app: cliente.servico?.nome ?? "",
            plano: PLANO_LABEL[cliente.plano],
            vencimento: dataPorExtenso(cliente.vencimento),
            prazo: faixa === "VENCIDO" ? "vencido" : "a vencer",
            valor: brl(cliente.valorPlano),
            novoValor: brl(cliente.valorPlano),
          }}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Histórico</h2>
        {cliente.renovacoes.length === 0 ? (
          <p className="text-sm text-text-dim">Nenhuma renovação registrada ainda.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {cliente.renovacoes.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-text-muted">{dataPorExtenso(r.data)} · {PLANO_LABEL[r.plano]}</span>
                <span className="font-semibold text-accent">{brl(r.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!cancelado ? (
        <div className="flex justify-center">
          <CancelarForm acao={cancelarCliente.bind(null, id)} />
        </div>
      ) : null}
    </div>
  );
}
