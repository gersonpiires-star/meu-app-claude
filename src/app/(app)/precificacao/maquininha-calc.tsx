"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Card, Field, Input, cx } from "@/components/ui";
import { brl, brl0 } from "@/lib/format";
import { PRAZO_LABEL, precoAVista, tabelaParcelado, type Prazo } from "@/lib/maquininha";
import { salvarMargemPadrao, salvarTaxasCartao } from "./actions";

const PRAZOS: Prazo[] = [0, 1, 2];

export function MaquininhaCalc({
  margemInicial,
  taxasIniciais,
}: {
  margemInicial: number;
  taxasIniciais: Record<number, number>;
}) {
  const [custo, setCusto] = useState(0);
  const [margem, setMargem] = useState(margemInicial);
  const [prazo, setPrazo] = useState<Prazo>(0);
  const [taxasSalvas, setTaxasSalvas] = useState(taxasIniciais);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [rascunho, setRascunho] = useState<Record<number, number>>({});
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [salvando, iniciarTransicao] = useTransition();

  const preco = useMemo(() => precoAVista(custo, margem), [custo, margem]);
  const tabela = useMemo(
    () => tabelaParcelado(preco, prazo, 12, modoEdicao ? rascunho : taxasSalvas),
    [preco, prazo, modoEdicao, rascunho, taxasSalvas]
  );

  function comecarEdicao() {
    setRascunho(Object.fromEntries(tabela.map((l) => [l.parcelas, l.taxa])));
    setModoEdicao(true);
  }

  function cancelarEdicao() {
    setModoEdicao(false);
    setRascunho({});
  }

  function aoEditarTaxa(parcelas: number, valor: string) {
    const taxa = Number(valor);
    if (!Number.isFinite(taxa)) return;
    setRascunho((atual) => ({ ...atual, [parcelas]: taxa }));
  }

  function salvar() {
    iniciarTransicao(async () => {
      await salvarTaxasCartao(rascunho);
      setTaxasSalvas(rascunho);
      setModoEdicao(false);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Custo do produto (R$)">
            <Input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(Number(e.target.value))} />
          </Field>
          <Field label="Margem desejada (%)">
            <Input
              type="number"
              min={0}
              max={95}
              value={margem}
              onChange={(e) => setMargem(Number(e.target.value))}
              onBlur={(e) => salvarMargemPadrao(Number(e.target.value))}
            />
          </Field>
        </div>
        <p className="mt-1 text-[11px] text-text-dim">A margem fica salva e sugere o preço de venda de aparelhos no registro de venda.</p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Preço à vista · Pix ou dinheiro</span>
          <span className="text-xl font-bold text-accent">{brl(preco)}</span>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Parcelado</h2>
        <div className="flex gap-1 rounded-lg border border-border-strong p-1">
          {PRAZOS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrazo(p)}
              className={cx(
                "rounded-md px-2.5 py-1 text-xs font-semibold",
                prazo === p ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"
              )}
            >
              {PRAZO_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0">
        <div className="relative flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Taxas de parcelamento da sua maquininha
            <button
              type="button"
              onClick={() => setAvisoAberto((a) => !a)}
              aria-label="O que é essa taxa"
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-text-dim text-[9px] normal-case leading-none text-text-dim hover:border-accent hover:text-accent"
            >
              i
            </button>
            {avisoAberto ? (
              <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-border-strong bg-surface p-3 text-[11px] normal-case tracking-normal text-text-muted shadow-lg">
                Essas taxas são só uma referência de mercado. Edite e salve cada uma pra bater com o que sua
                própria maquininha cobra — o valor certo está no extrato ou no app do seu banco.
              </div>
            ) : null}
          </span>
          {modoEdicao ? (
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="ghost" onClick={cancelarEdicao} disabled={salvando} className="px-2.5 py-1 text-xs">
                Cancelar
              </Button>
              <Button type="button" onClick={salvar} disabled={salvando} className="px-2.5 py-1 text-xs">
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" onClick={comecarEdicao} className="shrink-0 px-2.5 py-1 text-xs">
              Editar taxas
            </Button>
          )}
        </div>
        <div className="grid grid-cols-[0.7fr_1.3fr_1fr_0.9fr] gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          <span>Parc</span>
          <span>Taxa</span>
          <span className="text-right">Parcela</span>
          <span className="text-right">Total</span>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {tabela.map((l) => (
            <div key={l.parcelas} className="grid grid-cols-[0.7fr_1.3fr_1fr_0.9fr] items-center gap-2 px-4 py-2 text-sm">
              <span className="text-text">{l.parcelas}x</span>
              {modoEdicao ? (
                <span className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    step="0.01"
                    value={rascunho[l.parcelas] ?? l.taxa}
                    onChange={(e) => aoEditarTaxa(l.parcelas, e.target.value)}
                    className="w-14 min-w-0 rounded-md border border-accent bg-bg-deep px-1.5 py-1 text-xs text-accent outline-none focus:border-accent"
                  />
                  <span className="shrink-0">%</span>
                </span>
              ) : (
                <span className={cx("text-xs", l.personalizada ? "font-semibold text-accent" : "text-text-muted")}>
                  {l.taxa.toFixed(2)}%
                </span>
              )}
              <span className="text-right font-semibold text-accent">{brl(l.parcela)}</span>
              <span className="text-right font-semibold text-text">{brl0(l.total)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
