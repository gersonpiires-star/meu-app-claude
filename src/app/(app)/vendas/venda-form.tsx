"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select, cx } from "@/components/ui";
import { brl } from "@/lib/format";
import { precoAVista, taxaSugerida } from "@/lib/maquininha";

const FORMAS_PAGAMENTO = ["Pix", "Cartão", "Dinheiro"] as const;
const PARCELAS_OPCOES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function VendaForm({
  acao,
  produtos,
  clientes = [],
  margemPadrao,
}: {
  acao: (formData: FormData) => Promise<void>;
  produtos: { id: string; modelo: string; custoMedio: number }[];
  clientes?: { id: string; nome: string }[];
  margemPadrao: number;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [valorUnitario, setValorUnitario] = useState(0);
  const [valorEditadoManualmente, setValorEditadoManualmente] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState<(typeof FORMAS_PAGAMENTO)[number]>("Pix");
  const [parcelas, setParcelas] = useState(1);
  const [taxaPercentual, setTaxaPercentual] = useState(0);

  const ehCartao = formaPagamento === "Cartão";
  const bruto = quantidade * valorUnitario;
  const taxaValor = ehCartao ? (bruto * taxaPercentual) / 100 : 0;
  const liquido = bruto - taxaValor;
  const formaPagamentoFinal = ehCartao ? `Cartão ${parcelas}x` : formaPagamento;

  function escolherFormaPagamento(f: (typeof FORMAS_PAGAMENTO)[number]) {
    setFormaPagamento(f);
    setTaxaPercentual(f === "Cartão" ? taxaSugerida(parcelas) : 0);
  }

  function escolherParcelas(p: number) {
    setParcelas(p);
    setTaxaPercentual(taxaSugerida(p));
  }

  function escolherProduto(id: string) {
    setProdutoId(id);
    if (valorEditadoManualmente) return;
    const produto = produtos.find((p) => p.id === id);
    if (produto && produto.custoMedio > 0) {
      setValorUnitario(Math.round(precoAVista(produto.custoMedio, margemPadrao) * 100) / 100);
    }
  }

  return (
    <form className="flex flex-col gap-4" action={(formData) => iniciarTransicao(() => acao(formData))}>
      <Field label="Produto">
        <Select name="produtoId" required value={produtoId} onChange={(e) => escolherProduto(e.target.value)}>
          <option value="" disabled>
            Selecione…
          </option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.modelo}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Cliente (opcional)">
        <Select name="clienteId" defaultValue="">
          <option value="">Venda avulsa — sem cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Qtde">
          <Input
            type="number"
            name="quantidade"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Valor unit. (R$)">
          <Input
            type="number"
            name="valorUnitario"
            min={0}
            step="0.01"
            value={valorUnitario}
            onChange={(e) => {
              setValorUnitario(Number(e.target.value));
              setValorEditadoManualmente(true);
            }}
            required
          />
        </Field>
      </div>
      {!valorEditadoManualmente && produtoId && produtos.find((p) => p.id === produtoId)?.custoMedio ? (
        <p className="-mt-2 text-[11px] text-text-dim">
          Sugerido pelo custo médio de compra + margem de {margemPadrao}% (ajuste em Precificação · Maquininha).
        </p>
      ) : null}

      <Field label="Forma de pagamento">
        <input type="hidden" name="formaPagamento" value={formaPagamentoFinal} />
        <div className="grid grid-cols-3 gap-2">
          {FORMAS_PAGAMENTO.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => escolherFormaPagamento(f)}
              className={cx(
                "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                formaPagamento === f ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Field>

      {ehCartao ? (
        <Field label="Parcelas">
          <div className="flex flex-wrap gap-1.5">
            {PARCELAS_OPCOES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => escolherParcelas(p)}
                className={cx(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                  parcelas === p ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
                )}
              >
                {p}x
              </button>
            ))}
          </div>
        </Field>
      ) : null}

      <Field label={ehCartao ? "Taxa da maquininha (%)" : "Taxa (%)"}>
        <Input
          type="number"
          name="taxaPercentual"
          min={0}
          step="0.01"
          value={taxaPercentual}
          onChange={(e) => setTaxaPercentual(Number(e.target.value))}
          disabled={!ehCartao}
        />
      </Field>

      <div className="flex flex-col gap-1 rounded-xl border border-border-strong bg-surface-2 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-dim">Bruto</span>
          <span className="font-semibold text-text">{brl(bruto)}</span>
        </div>
        {ehCartao ? (
          <div className="flex items-center justify-between">
            <span className="text-text-dim">Taxa ({taxaPercentual.toFixed(2)}%)</span>
            <span className="font-semibold text-danger">− {brl(taxaValor)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-border pt-1">
          <span className="font-semibold text-text-dim">Líquido</span>
          <span className="text-lg font-bold text-accent">{brl(liquido)}</span>
        </div>
      </div>

      <Button type="submit" disabled={pendente || produtos.length === 0} className="mt-1 w-full">
        {pendente ? "Registrando…" : "Registrar venda"}
      </Button>
      {produtos.length === 0 ? (
        <p className="text-center text-xs text-text-dim">Cadastre um produto no estoque antes de vender.</p>
      ) : null}
    </form>
  );
}
