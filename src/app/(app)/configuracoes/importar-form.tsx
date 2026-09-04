"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input } from "@/components/ui";
import { CampoArquivo } from "@/components/campo-arquivo";
import { importarDadosAntigos } from "./importar-actions";

export function ImportarForm({ podeZerar = true }: { podeZerar?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [zerar, setZerar] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  // O navegador reseta o checkbox (não-controlado) direto no DOM depois de
  // todo submit, mas o React não fica sabendo — ele acha que o valor
  // continua sendo o último que viu, então um clique que "parece" repetir
  // esse valor não dispara onChange de novo. Trocar essa key recria só o
  // checkbox a cada tentativa, sem esse rastreamento desatualizado.
  const [tentativaId, setTentativaId] = useState(0);

  if (!aberto) {
    return (
      <Button variant="ghost" onClick={() => setAberto(true)}>
        Importar dados de outro sistema
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) =>
        iniciarTransicao(async () => {
          const resposta = await importarDadosAntigos(formData);
          setResultado(resposta.ok ? { ok: true, texto: resposta.resumo } : { ok: false, texto: resposta.erro });
          // Depois do submit o navegador reseta os campos do form (mesmo em
          // caso de erro) — o checkbox abaixo é não-controlado de propósito
          // pra nunca dessincronizar do valor real que seria enviado; só
          // escondemos a confirmação aqui pra acompanhar esse reset.
          setZerar(false);
          setTentativaId((n) => n + 1);
        })
      }
    >
      <p className="text-sm text-text-muted">
        Escolha o arquivo de backup/exportação (JSON) do seu app anterior. Isso cria seus clientes,
        produtos, vendas e histórico de renovações aqui no GestorPro.
      </p>
      <CampoArquivo name="json" accept=".json,application/json" required />

      {podeZerar ? (
        <div className="flex flex-col gap-2 rounded-xl border border-danger-border bg-danger-bg/30 p-3">
          <label className="flex items-start gap-2 text-xs font-semibold text-danger">
            <input
              key={tentativaId}
              type="checkbox"
              name="zerarAntes"
              onChange={(e) => setZerar(e.target.checked)}
              className="mt-0.5"
            />
            Apagar todos os dados atuais (clientes, vendas, produtos/estoque, plataformas, serviços e
            chaves Pix) antes de importar este arquivo
          </label>
          {zerar ? (
            <Field label='Digite "ZERAR" para confirmar'>
              <Input name="confirmacaoZerar" placeholder="ZERAR" />
            </Field>
          ) : null}
        </div>
      ) : null}

      {resultado ? (
        <p className={resultado.ok ? "text-sm text-accent" : "text-sm text-danger"}>{resultado.texto}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setAberto(false)}>
          Fechar
        </Button>
        <Button type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Importando…" : "Importar"}
        </Button>
      </div>
      <p className="text-xs text-text-dim">
        Se você importar o mesmo arquivo de novo por engano, o app bloqueia — não duplica os clientes.
      </p>
    </form>
  );
}
