import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { brl, brl0, dataCurta, dataHora, dataPorExtenso, diaCivilBr, fmtTelefone, horaCurta, iniciais, inicioDoDiaBr } from "@/lib/format";
import { PLANO_LABEL, diasParaVencer, faixaVencimento } from "@/lib/planos";
import { MODELOS_COMUNICADO, mesclarModelos, preencherModelo } from "@/lib/mensagens";
import { faixaPontualidade } from "@/lib/pontualidade";
import { ehAniversarioDeCasa } from "@/lib/aniversario";
import { Badge, Button, Card, cx } from "@/components/ui";
import { renovarCliente, cancelarCliente, excluirCliente, corrigirVencimento, aplicarReajusteCliente } from "../actions";
import { ReajusteForm } from "./reajuste-form";
import { RenovarForm } from "./renovar-form";
import { CancelarForm } from "./cancelar-form";
import { ExcluirBotao } from "./excluir-botao";
import { CorrigirVencimento } from "./corrigir-vencimento";
import { ConverterTesteBotao } from "./converter-teste-botao";
import { RegistrarCobrancaLink } from "../../painel/registrar-cobranca-link";
import { RenovarBotao } from "../renovar-em-lote/renovar-botao";
import { CobrarBotao } from "../cobrar-botao";

type Tom = "neutral" | "danger" | "warning" | "success";

const AVATAR_TOM: Record<Tom, string> = {
  neutral: "bg-surface-2 text-text-muted",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  success: "bg-accent-soft text-accent",
};

const BARRA_COR: Record<Tom, string> = {
  neutral: "bg-text-dim",
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-accent",
};

const TEXTO_COR: Record<Tom, string> = {
  neutral: "text-text-dim",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-accent",
};

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

function mesesComoCliente(criadoEm: Date, hoje: Date = new Date()): number {
  const c = diaCivilBr(criadoEm);
  const h = diaCivilBr(hoje);
  let m = (h.ano - c.ano) * 12 + (h.mes - c.mes);
  if (h.dia < c.dia) m -= 1;
  return Math.max(0, m);
}

function ehClienteNovo(criadoEm: Date, ate: Date = new Date()): boolean {
  const dias = Math.floor((ate.getTime() - criadoEm.getTime()) / 86400000);
  return dias <= 7;
}

function tempoDeCasa(desde: Date, ate: Date = new Date()): string {
  const d = diaCivilBr(desde);
  const a = diaCivilBr(ate);
  const meses = Math.max(0, (a.ano - d.ano) * 12 + (a.mes - d.mes));
  if (meses < 1) {
    const dias = Math.max(0, Math.round((ate.getTime() - desde.getTime()) / 86400000));
    return `${dias} dia${dias === 1 ? "" : "s"}`;
  }
  if (meses < 12) return `${meses} mês${meses === 1 ? "" : "es"}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto ? `${anos}a ${resto}m` : `${anos} ano${anos === 1 ? "" : "s"}`;
}

function InfoTile({ label, value, span2 = false, tom = "neutral" as Tom }: { label: string; value: string; span2?: boolean; tom?: Tom }) {
  const destacado = tom !== "neutral";
  return (
    <div
      className={cx(
        "rounded-xl border p-3.5",
        span2 ? "col-span-2" : "",
        destacado ? "border-accent-strong bg-accent-soft" : "border-border bg-surface-2"
      )}
    >
      <p className={cx("text-[10px] font-semibold uppercase tracking-wider", destacado ? TEXTO_COR[tom] : "text-text-dim")}>{label}</p>
      <p className={cx("mt-1 text-base font-semibold", destacado ? TEXTO_COR[tom] : "text-text")}>{value}</p>
    </div>
  );
}

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const revendedor = await exigirRevendedor();
  const { id } = await params;

  const [cliente, overridesModelos] = await Promise.all([
    prisma.cliente.findUnique({
      where: { id, revendedorId: revendedor.id },
      include: {
        servico: true,
        renovacoes: { orderBy: { data: "desc" } },
        vendas: true,
        cobrancas: { orderBy: { criadoEm: "desc" }, take: 10 },
        indicadoPor: { select: { id: true, nome: true } },
        indicados: { select: { id: true, nome: true, status: true, valorPlano: true }, orderBy: { nome: "asc" } },
      },
    }),
    prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } }),
  ]);
  if (!cliente) notFound();
  const modelos = mesclarModelos(overridesModelos);

  const estado = estadoCliente(cliente.status, cliente.vencimento);
  const faixa = faixaVencimento(cliente.vencimento);
  const dias = diasParaVencer(cliente.vencimento);
  const barraPct = Math.max(4, Math.min(100, Math.round(100 - (dias / 93) * 100)));
  const ltvRenovacoes = cliente.renovacoes.reduce((a, r) => a + r.valor, 0);
  const ltvVendas = cliente.vendas.reduce((a, v) => a + v.quantidade * v.valorUnitario, 0);
  const jaRendeu = ltvRenovacoes + ltvVendas;
  const cancelado = cliente.status === "CANCELADO";
  const clienteNovo = ehClienteNovo(cliente.criadoEm) && !cliente.testeGratis && !cancelado;
  const pontualidade = faixaPontualidade(cliente.cobrancas.length, cliente.renovacoes.length);
  const mesesCasa = mesesComoCliente(cliente.criadoEm);
  const clienteHaTexto = mesesCasa < 1 ? "Entrou este mês" : tempoDeCasa(cliente.criadoEm);
  const aniversario = ehAniversarioDeCasa(cliente.criadoEm);
  const indicadosAtivos = cliente.indicados.filter((i) => i.status !== "CANCELADO");
  const receitaIndicados = indicadosAtivos.reduce((a, i) => a + i.valorPlano, 0);

  const pendentes: string[] = [];
  if (!cliente.whatsapp) pendentes.push("WhatsApp incompleto — cobrança não funciona");
  if (!cliente.servico) pendentes.push("Serviço não informado");
  if (!cliente.valorPlano) pendentes.push("Valor do plano não informado");

  const hoje0 = inicioDoDiaBr();
  const cobrancasHoje = cliente.cobrancas.filter((c) => c.criadoEm >= hoje0);

  const renovado = cliente.renovacoes.length > 0;
  const renTexto = renovado
    ? `✓ ${PLANO_LABEL[cliente.renovacoes[0].plano]} · última em ${dataCurta(cliente.renovacoes[0].data)}`
    : "Nenhuma renovação registrada";

  const historico = [
    ...cobrancasHoje.map((c) => ({ label: `Cobrança enviada (${c.modelo.toLowerCase()})`, data: horaCurta(c.criadoEm), tom: "warning" as Tom })),
    ...cliente.renovacoes.slice(0, 6).map((r) => ({ label: `Renovado — ${PLANO_LABEL[r.plano]}`, data: dataHora(r.data), tom: "success" as Tom })),
    ...pendentes.map((p) => ({ label: p, data: "FALTA", tom: "danger" as Tom })),
    { label: "Cadastro do cliente", data: dataCurta(cliente.criadoEm), tom: "neutral" as Tom },
  ];

  const dadosMensagem = {
    nome: cliente.nome,
    app: cliente.servico?.nome ?? "",
    plano: PLANO_LABEL[cliente.plano],
    vencimento: dataPorExtenso(cliente.vencimento),
    prazo: faixa === "VENCIDO" ? "vencido" : "a vencer",
    valor: brl(cliente.valorPlano),
    novoValor: brl(cliente.valorPlano),
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/clientes" className="text-xs font-semibold text-text-dim hover:text-text">
          ‹ Clientes
        </Link>
        {!cancelado ? (
          <div className="flex gap-4">
            <Link href={`/clientes/${id}/editar`} className="text-xs font-semibold text-accent hover:underline">
              Editar
            </Link>
            <ExcluirBotao acao={excluirCliente.bind(null, id)} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className={cx("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold", AVATAR_TOM[estado.tom])}>
          {iniciais(cliente.nome)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-text">{cliente.nome}</h1>
          <Badge tone={estado.tom}>
            {estado.label} · {cliente.whatsapp ? fmtTelefone(cliente.whatsapp) : "sem WhatsApp"}
          </Badge>
        </div>
      </div>

      {!cancelado ? (
        <Card className="flex flex-col gap-3 bg-gradient-to-br from-accent-soft to-surface">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Próximo vencimento</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text">{dataPorExtenso(cliente.vencimento)}</span>
            <span className={cx("text-xs font-semibold", TEXTO_COR[estado.tom])}>{diasTexto(cliente.vencimento)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div className={cx("h-1.5 rounded-full", BARRA_COR[estado.tom])} style={{ width: `${barraPct}%` }} />
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <InfoTile label="Plano" value={PLANO_LABEL[cliente.plano]} />
        <InfoTile label="Valor" value={brl(cliente.valorPlano)} />
        <InfoTile label="Cliente há" value={clienteHaTexto} />
        <InfoTile label="Telas" value={`${cliente.telas} tela${cliente.telas === 1 ? "" : "s"}`} />
        <InfoTile label="Vencimento" value={cliente.diaFixo ? `Dia ${cliente.diaFixo}` : "Pelo plano"} />
        <InfoTile label="Serviço" value={cliente.servico?.nome ?? "—"} />
      </div>

      {cliente.indicadoPor || cliente.indicados.length > 0 ? (
        <Card className="flex flex-col gap-3">
          {cliente.indicadoPor ? (
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-text-dim">Indicado por</span>
              <Link href={`/clientes/${cliente.indicadoPor.id}`} className="text-sm font-semibold text-accent hover:underline">
                {cliente.indicadoPor.nome}
              </Link>
            </div>
          ) : null}
          {cliente.indicados.length > 0 ? (
            <div className={cx("flex flex-col gap-2", cliente.indicadoPor ? "border-t border-border pt-3" : "")}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-text-dim">
                  Indicou {cliente.indicados.length} cliente{cliente.indicados.length === 1 ? "" : "s"}
                </span>
                {receitaIndicados > 0 ? (
                  <span className="text-xs font-semibold text-accent">{brl0(receitaIndicados)}/mês em receita</span>
                ) : null}
              </div>
              <div className="flex flex-col divide-y divide-border">
                {cliente.indicados.map((i) => (
                  <Link
                    key={i.id}
                    href={`/clientes/${i.id}`}
                    className="flex items-center justify-between gap-3 py-1.5 text-sm hover:text-accent"
                  >
                    <span className="truncate text-text-muted">{i.nome}</span>
                    {i.status === "CANCELADO" ? <Badge tone="neutral">Cancelado</Badge> : <Badge tone="success">Ativo</Badge>}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {clienteNovo ? (
        <Card className="flex flex-col gap-3 border-success-border bg-success-bg/30">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-success">Cliente novo</p>
              <p className="text-xs text-text-dim">
                {ehClienteNovo(cliente.criadoEm) ? "Cadastrado recentemente" : ""} · vence {dataCurta(cliente.vencimento)}
              </p>
            </div>
          </div>
          {cliente.whatsapp ? (
            <RegistrarCobrancaLink
              clienteId={id}
              whatsapp={cliente.whatsapp}
              mensagem={preencherModelo(modelos["Boas-vindas"] ?? MODELOS_COMUNICADO["Boas-vindas"], dadosMensagem)}
              modelo="Boas-vindas"
            >
              <Button variant="whatsapp" className="w-full">
                Enviar boas-vindas
              </Button>
            </RegistrarCobrancaLink>
          ) : (
            <p className="text-xs text-text-dim">Cadastre o WhatsApp em Editar para enviar boas-vindas.</p>
          )}
        </Card>
      ) : null}

      {cliente.testeGratis ? (
        <Card className="flex flex-col gap-3 border-accent-strong bg-accent-soft/60">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-accent">Cliente em teste grátis</p>
              <p className="text-xs text-text-dim">{diasTexto(cliente.vencimento)}</p>
            </div>
          </div>
          <ConverterTesteBotao clienteId={id} nome={cliente.nome} />
        </Card>
      ) : null}

      {pendentes.length > 0 ? (
        <Link
          href={`/clientes/${id}/editar`}
          className="flex items-center gap-2.5 rounded-xl border border-danger-border bg-danger-bg/40 px-4 py-3"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
          <span className="flex-1 text-sm text-danger">
            {pendentes.length} {pendentes.length === 1 ? "informação" : "informações"} faltando no cadastro
          </span>
          <span className="text-xs font-semibold text-danger">CORRIGIR</span>
        </Link>
      ) : null}

      {aniversario.ehAniversario ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-accent-strong bg-accent-soft px-4 py-3">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span className="text-sm font-semibold text-accent">
            Completa {aniversario.anos} ano{aniversario.anos === 1 ? "" : "s"} de casa — vale um agradecimento
          </span>
        </div>
      ) : null}

      {cancelado ? (
        <Card className="flex flex-col gap-1 border-warning-border bg-warning-bg/30">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
            Saiu em {cliente.motivoSaidaData ? dataCurta(cliente.motivoSaidaData) : "—"}
          </span>
          <span className="text-sm font-semibold text-text">{cliente.motivoSaida || "Motivo não informado"}</span>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Já rendeu</span>
          <span className="text-[10px] text-text-dim">Cliente há {tempoDeCasa(cliente.criadoEm)}</span>
        </div>
        {jaRendeu > 0 ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-accent">{brl(jaRendeu)}</span>
              <span className="text-xs font-semibold text-accent/80">
                {mesesCasa >= 1 ? `${brl(jaRendeu / mesesCasa)} / mês` : "—"}
              </span>
            </div>
            <p className="border-t border-border pt-2 text-xs text-text-dim">
              {cliente.renovacoes.length} {cliente.renovacoes.length === 1 ? "renovação" : "renovações"}
              {ltvVendas > 0 ? ` · ${brl0(ltvVendas)} em produto` : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-text-dim">
            Sem renovações registradas ainda — o total aparece a partir do primeiro pagamento marcado no app.
          </p>
        )}
      </Card>

      <div
        className={cx(
          "flex flex-col gap-1 rounded-xl border px-4 py-3",
          pontualidade.faixa === "PAGA_SOZINHO" || pontualidade.faixa === "PAGA_NA_LEMBRANCA"
            ? "border-success-border bg-success-bg/30"
            : pontualidade.faixa === "PRECISA_INSISTIR"
              ? "border-warning-border bg-warning-bg/30"
              : pontualidade.faixa === "SO_PAGA_COBRADO"
                ? "border-danger-border bg-danger-bg/30"
                : "border-border bg-surface-2"
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cx(
              "h-1.5 w-1.5 rounded-full",
              pontualidade.faixa === "PAGA_SOZINHO" || pontualidade.faixa === "PAGA_NA_LEMBRANCA"
                ? "bg-success"
                : pontualidade.faixa === "PRECISA_INSISTIR"
                  ? "bg-warning"
                  : pontualidade.faixa === "SO_PAGA_COBRADO"
                    ? "bg-danger"
                    : "bg-text-dim"
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">{pontualidade.label}</span>
        </div>
        <p className="text-xs text-text-muted">
          {pontualidade.faixa === "SEM_HISTORICO"
            ? "Aparece depois do primeiro pagamento registrado"
            : `${cliente.cobrancas.length} cobrança(s) para ${cliente.renovacoes.length} pagamento(s)${
                cliente.renovacoes.length > 0 ? ` · ${pontualidade.razao.toFixed(1).replace(".", ",")} por pagamento` : ""
              }`}
        </p>
      </div>

      {cliente.anotacao ? (
        <Card className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Anotação</p>
          <p className="whitespace-pre-wrap text-sm text-text-muted">{cliente.anotacao}</p>
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Histórico</h2>
          <span className={cx("text-xs font-semibold", renovado ? "text-accent" : "text-text-dim")}>{renTexto}</span>
        </div>
        <div className="flex max-h-72 flex-col overflow-y-auto pr-3 [scrollbar-gutter:stable]">
          {historico.map((h, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
              <span className={cx("h-1.5 w-1.5 shrink-0 rounded-full", BARRA_COR[h.tom])} />
              <span className={cx("flex-1 text-sm", h.tom === "danger" ? "text-danger" : "text-text-muted")}>{h.label}</span>
              <span className="shrink-0 text-xs text-text-dim">{h.data}</span>
            </div>
          ))}
        </div>
      </Card>

      {!cancelado ? (
        <div className="flex flex-col gap-2">
          {cliente.whatsapp ? (
            <CobrarBotao clienteId={id} cobradoEm={cobrancasHoje[0]?.criadoEm ?? null} label="Cobrar no WhatsApp" variant="whatsapp" />
          ) : (
            <Link href={`/clientes/${id}/editar`}>
              <Button variant="ghost" className="w-full">
                Cadastre o WhatsApp para cobrar
              </Button>
            </Link>
          )}
          <RenovarForm
            acao={renovarCliente.bind(null, id)}
            planoAtual={cliente.plano}
            valorAtual={cliente.valorPlano}
            custoCredito={cliente.servico?.custoCredito ?? 0}
          />
          <div className="flex gap-2">
            <RenovarBotao clienteId={id} className="min-w-0 flex-1" label="Marcar como pago" labelFeito="✓ Pago" />
            <CancelarForm acao={cancelarCliente.bind(null, id)} label="Marcar como inativo" className="flex-1" />
          </div>
        </div>
      ) : null}

      <details className="rounded-xl border border-border-strong">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-text-dim">Ajustes avançados</summary>
        <div className="flex flex-col gap-3 border-t border-border p-4">
          <CorrigirVencimento
            vencimentoAtual={cliente.vencimento}
            diaFixo={cliente.diaFixo}
            acao={corrigirVencimento.bind(null, id)}
            podeEditar={!cancelado}
          />
          <ReajusteForm
            plano={cliente.plano}
            valorAtual={cliente.valorPlano}
            acao={aplicarReajusteCliente.bind(null, id)}
            podeEditar={!cancelado}
          />
        </div>
      </details>
    </div>
  );
}
