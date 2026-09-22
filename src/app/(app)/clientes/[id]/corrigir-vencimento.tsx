"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { dataCurta, dataPorExtenso, diaCivilBr } from "@/lib/format";

// Nunca ler getDate()/getMonth()/getFullYear() direto aqui: isso pega o dia
// no fuso do navegador de quem está usando o app, não em Brasília — um
// revendedor com o relógio do aparelho em outro fuso via aqui um dia
// diferente do que o resto da página (que já usa diaCivilBr) mostra pro
// mesmo vencimento.
function paraDDMMAAAA(d: Date): string {
  const { ano, mes, dia } = diaCivilBr(d);
  return `${String(dia).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}`;
}

export function CorrigirVencimento({
  vencimentoAtual,
  diaFixo,
  acao,
  podeEditar = true,
}: {
  vencimentoAtual: Date;
  diaFixo: number | null;
  acao: (formData: FormData) => Promise<void>;
  podeEditar?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [novoTexto, setNovoTexto] = useState(paraDDMMAAAA(vencimentoAtual));
  const [pendente, iniciarTransicao] = useTransition();
  const mudou = novoTexto !== paraDDMMAAAA(vencimentoAtual);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Próximo vencimento</p>
        {podeEditar && !aberto ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-accent hover:underline"
            onClick={() => setAberto(true)}
          >
            Corrigir
          </button>
        ) : null}
      </div>

      {!aberto ? (
        <>
          <p className="mt-0.5 font-semibold text-text">{dataPorExtenso(vencimentoAtual)}</p>
          {diaFixo ? <p className="text-xs text-text-dim">Dia fixo: {diaFixo}</p> : null}
        </>
      ) : (
        <form
          className="mt-2 flex flex-col gap-2"
          action={(formData) =>
            iniciarTransicao(async () => {
              await acao(formData);
              setAberto(false);
            })
          }
        >
          <Input
            name="vencimento"
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            placeholder="DD/MM/AAAA"
            className="text-sm"
          />
          {mudou ? (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">
              Alterações pendentes — era {dataCurta(vencimentoAtual)}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
              Voltar
            </Button>
            <Button type="submit" disabled={pendente || !mudou} className="flex-1">
              {pendente ? "Salvando…" : "Confirmar alteração"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
