"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { importarDadosAntigos } from "./importar-actions";

export function ImportarForm() {
  const [aberto, setAberto] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

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
        })
      }
    >
      <p className="text-sm text-text-muted">
        Cole abaixo o conteúdo do arquivo de backup/exportação do seu app anterior (JSON). Isso cria
        seus clientes, produtos, vendas e histórico de renovações aqui no GestorPro.
      </p>
      <Textarea name="json" placeholder='{"app": "...", "dados": {...}}' className="min-h-48 font-mono text-xs" />
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
        Só rode uma vez — importar o mesmo arquivo de novo duplica os clientes.
      </p>
    </form>
  );
}
