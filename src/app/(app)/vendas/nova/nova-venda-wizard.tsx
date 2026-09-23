"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, Field, Input, Select, cx } from "@/components/ui";
import { brl } from "@/lib/format";
import { PLANO_LABEL, PLANO_MESES, PLANO_VALOR_SUGERIDO } from "@/lib/planos";
import { precoAVista } from "@/lib/maquininha";
import type { PlanoCliente } from "@/generated/prisma/enums";

const PLANOS: PlanoCliente[] = ["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"];
const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Mercado Pago · à vista", "Mercado Pago · parcelado", "Transferência"];

type Cliente = {
  id: string;
  nome: string;
  plano: PlanoCliente;
  valorPlano: number;
  diaFixo: number | null;
  custoCredito: number;
  situacao: string;
};

type Produto = { id: string; modelo: string; custoProximoLote: number; estoqueAtual: number };

type Tipo = "RENOVACAO" | "COMBO" | "SO_APARELHO";

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function NovaVendaWizard({
  clientes,
  produtos,
  margemPadrao,
  clienteIdInicial,
  acaoRenovacao,
  acaoCombo,
  acaoAparelho,
}: {
  clientes: Cliente[];
  produtos: Produto[];
  margemPadrao: number;
  clienteIdInicial: string;
  acaoRenovacao: (id: string, formData: FormData) => Promise<{ ok: true; renovacaoId: string } | { ok: false; erro: string }>;
  acaoCombo: (formData: FormData) => Promise<{ erro: string } | undefined>;
  acaoAparelho: (formData: FormData) => Promise<{ erro: string } | undefined>;
}) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [trocandoCliente, setTrocandoCliente] = useState(!clienteIdInicial);

  const [clienteId, setClienteId] = useState(clienteIdInicial);
  const [tipo, setTipo] = useState<Tipo>("RENOVACAO");

  const [plano, setPlano] = useState<PlanoCliente>("MENSAL");
  const [valorPlano, setValorPlano] = useState<number | "">(PLANO_VALOR_SUGERIDO.MENSAL);
  const [custoPlano, setCustoPlano] = useState<number | "">(0);
  const [apartirDoVencimento, setApartirDoVencimento] = useState(true);

  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState<number | "">(1);
  const [valorAparelho, setValorAparelho] = useState<number | "">(0);

  const [formaPagamento, setFormaPagamento] = useState(FORMAS_PAGAMENTO[0]);
  const [data, setData] = useState(hojeISO());

  const cliente = clientes.find((c) => c.id === clienteId);
  const produto = produtos.find((p) => p.id === produtoId);
  const precisaCliente = tipo !== "SO_APARELHO";
  const precisaProduto = tipo !== "RENOVACAO";

  function escolherCliente(id: string) {
    setClienteId(id);
    setTrocandoCliente(false);
    setErro(null);
    const c = clientes.find((x) => x.id === id);
    if (c) {
      setPlano(c.plano);
      setValorPlano(c.valorPlano);
      setCustoPlano(Math.round(PLANO_MESES[c.plano] * c.custoCredito * 100) / 100);
    }
  }

  function escolherPlano(novo: PlanoCliente) {
    setPlano(novo);
    setValorPlano(PLANO_VALOR_SUGERIDO[novo]);
    setCustoPlano(cliente ? Math.round(PLANO_MESES[novo] * cliente.custoCredito * 100) / 100 : 0);
  }

  function escolherProduto(id: string) {
    setProdutoId(id);
    setErro(null);
    const p = produtos.find((x) => x.id === id);
    if (p && p.custoProximoLote > 0) {
      setValorAparelho(Math.round(precoAVista(p.custoProximoLote, margemPadrao) * 100) / 100);
    }
  }

  const valorPlanoNum = Number(valorPlano) || 0;
  const custoPlanoNum = Number(custoPlano) || 0;
  const valorAparelhoNum = Number(valorAparelho) || 0;
  const quantidadeNum = Number(quantidade) || 0;
  const custoAparelhoTotal = produto ? produto.custoProximoLote * quantidadeNum : 0;

  const valorTotal = tipo === "RENOVACAO" ? valorPlanoNum : tipo === "COMBO" ? valorPlanoNum + valorAparelhoNum * quantidadeNum : valorAparelhoNum * quantidadeNum;
  const custoTotal = tipo === "RENOVACAO" ? custoPlanoNum : tipo === "COMBO" ? custoPlanoNum + custoAparelhoTotal : custoAparelhoTotal;
  const lucroTotal = valorTotal - custoTotal;

  const semEstoque = precisaProduto && !!produto && quantidadeNum > produto.estoqueAtual;

  const podeConfirmar =
    !pendente &&
    (!precisaCliente || !!clienteId) &&
    (!precisaProduto || (!!produtoId && !semEstoque && quantidadeNum > 0)) &&
    valorTotal >= 0;

  function confirmar() {
    setErro(null);
    iniciarTransicao(async () => {
      const formData = new FormData();
      formData.set("formaPagamento", formaPagamento);
      formData.set("data", data);

      if (tipo === "RENOVACAO") {
        formData.set("plano", plano);
        formData.set("valor", String(valorPlanoNum));
        formData.set("custo", String(custoPlanoNum));
        formData.set("apartirDoVencimento", apartirDoVencimento ? "true" : "false");
        const resultado = await acaoRenovacao(clienteId, formData);
        if (!resultado.ok) {
          setErro(resultado.erro);
          return;
        }
        router.push("/vendas");
        return;
      }

      if (tipo === "COMBO") {
        formData.set("clienteId", clienteId);
        formData.set("produtoId", produtoId);
        formData.set("quantidade", String(quantidadeNum));
        formData.set("valorAparelho", String(valorAparelhoNum));
        formData.set("plano", plano);
        formData.set("valorPlano", String(valorPlanoNum));
        formData.set("custoPlano", String(custoPlanoNum));
        formData.set("apartirDoVencimento", apartirDoVencimento ? "true" : "false");
        const resultado = await acaoCombo(formData);
        if (resultado?.erro) setErro(resultado.erro);
        return;
      }

      formData.set("produtoId", produtoId);
      if (clienteId) formData.set("clienteId", clienteId);
      formData.set("quantidade", String(quantidadeNum));
      formData.set("valorUnitario", String(valorAparelhoNum));
      formData.set("taxaPercentual", "0");
      const resultado = await acaoAparelho(formData);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  const novoVencimentoTexto = useMemo(() => {
    if (!cliente || tipo === "SO_APARELHO") return null;
    return `${PLANO_MESES[plano]} ${PLANO_MESES[plano] === 1 ? "mês" : "meses"} a partir de ${apartirDoVencimento ? "quando venceu" : "hoje"}`;
  }, [cliente, tipo, plano, apartirDoVencimento]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {precisaCliente ? (
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Cliente</h2>
            {cliente && !trocandoCliente ? (
              <div className="flex items-center gap-3">
                <Avatar nome={cliente.nome} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-text">{cliente.nome}</p>
                  <p className="text-xs text-text-dim">
                    {PLANO_LABEL[cliente.plano]} · {cliente.situacao}
                  </p>
                </div>
                <button type="button" onClick={() => setTrocandoCliente(true)} className="text-xs font-semibold text-accent hover:underline">
                  Trocar
                </button>
              </div>
            ) : (
              <Select value={clienteId} onChange={(e) => escolherCliente(e.target.value)}>
                <option value="" disabled>
                  Selecione um cliente…
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.situacao}
                  </option>
                ))}
              </Select>
            )}
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">O que você está vendendo?</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                { valor: "RENOVACAO" as const, titulo: "Renovação", desc: "Cliente atual renovando o plano. Usa 1 crédito." },
                { valor: "COMBO" as const, titulo: "Aparelho + assinatura", desc: "Combo de aparelho com plano. Baixa do estoque." },
                { valor: "SO_APARELHO" as const, titulo: "Só aparelho", desc: "Venda avulsa do aparelho, sem plano." },
              ]
            ).map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => {
                  setTipo(opcao.valor);
                  setErro(null);
                }}
                className={cx(
                  "flex flex-col gap-1 rounded-xl border p-3 text-left transition",
                  tipo === opcao.valor ? "border-accent bg-accent-soft/40" : "border-border-strong hover:border-border"
                )}
              >
                <span className={cx("text-sm font-bold", tipo === opcao.valor ? "text-accent" : "text-text")}>{opcao.titulo}</span>
                <span className="text-xs text-text-dim">{opcao.desc}</span>
              </button>
            ))}
          </div>
        </Card>

        {tipo !== "SO_APARELHO" ? (
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Plano</h2>
            <div className="flex flex-wrap gap-2">
              {PLANOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => escolherPlano(p)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    plano === p ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
                  )}
                >
                  {PLANO_LABEL[p]}
                </button>
              ))}
            </div>
            {cliente ? (
              <label className="mt-3 flex items-center gap-2 text-xs text-text-dim">
                <input
                  type="checkbox"
                  checked={apartirDoVencimento}
                  onChange={(e) => setApartirDoVencimento(e.target.checked)}
                  className="h-4 w-4 rounded border-border-strong accent-accent"
                />
                Contar a partir do vencimento antigo em vez de hoje
              </label>
            ) : null}
          </Card>
        ) : null}

        {precisaProduto ? (
          <Card>
            <h2 className="mb-3 text-sm font-bold text-text">Aparelho</h2>
            <div className="grid grid-cols-[1fr_100px] gap-3">
              <Field label="Produto">
                <Select value={produtoId} onChange={(e) => escolherProduto(e.target.value)}>
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.modelo} — {p.estoqueAtual > 0 ? `${p.estoqueAtual} em estoque` : "sem estoque"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Qtde">
                <Input
                  type="number"
                  min={1}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Field>
            </div>
            {produto ? (
              <p className={cx("mt-2 text-[11px]", semEstoque ? "font-semibold text-danger" : "text-text-dim")}>
                {produto.estoqueAtual} unidade{produto.estoqueAtual === 1 ? "" : "s"} em estoque
              </p>
            ) : null}
            {produtos.length === 0 ? <p className="mt-2 text-xs text-text-dim">Cadastre um produto no Estoque antes de vender.</p> : null}
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Valores e pagamento</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {tipo !== "SO_APARELHO" ? (
              <Field label="Valor do plano (R$)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorPlano}
                  onChange={(e) => setValorPlano(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Field>
            ) : null}
            {tipo !== "SO_APARELHO" ? (
              <Field label="Custo do crédito (R$)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={custoPlano}
                  onChange={(e) => setCustoPlano(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Field>
            ) : null}
            {precisaProduto ? (
              <Field label="Valor do aparelho (R$/un)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorAparelho}
                  onChange={(e) => setValorAparelho(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Field>
            ) : null}
            <Field label="Data do pagamento">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
          </div>

          <p className="mt-1 text-[11px] text-text-dim">Sugerido pela Precificação — ajuste se cobrou diferente.</p>

          <div className="mt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Forma de pagamento</p>
            <div className="flex flex-wrap gap-2">
              {FORMAS_PAGAMENTO.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormaPagamento(f)}
                  className={cx(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    formaPagamento === f ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:sticky lg:top-5 lg:self-start">
        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-text">Resumo</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Cliente</span>
              <span className="font-semibold text-text">{cliente?.nome ?? "Venda avulsa"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Tipo</span>
              <span className="font-semibold text-text">
                {tipo === "RENOVACAO" ? "Renovação" : tipo === "COMBO" ? "Combo" : "Só aparelho"}
              </span>
            </div>
            {tipo !== "SO_APARELHO" ? (
              <div className="flex items-center justify-between">
                <span className="text-text-dim">Plano</span>
                <span className="font-semibold text-text">{PLANO_LABEL[plano]}</span>
              </div>
            ) : null}
            {novoVencimentoTexto ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-dim">Novo vencimento</span>
                <span className="text-right text-xs font-semibold text-text">{novoVencimentoTexto}</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Valor cobrado</span>
              <span className="font-semibold text-money">{brl(valorTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-dim">Custo</span>
              <span className="font-semibold text-danger">− {brl(custoTotal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-1">
              <span className="font-bold text-text">Lucro</span>
              <span className="text-lg font-bold text-accent">{brl(lucroTotal)}</span>
            </div>
          </div>

          {erro ? <p className="text-sm font-semibold text-danger">{erro}</p> : null}

          <Button onClick={confirmar} disabled={!podeConfirmar} className="w-full">
            {pendente ? "Confirmando…" : semEstoque ? "Sem estoque suficiente" : "Confirmar venda"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
