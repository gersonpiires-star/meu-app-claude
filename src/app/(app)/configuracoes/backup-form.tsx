"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { restaurarBackup } from "./backup-actions";

export function BackupForm() {
  const [restaurando, setRestaurando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href="/api/exportar" className="flex-1">
          <Button variant="ghost" className="w-full">
            Baixar backup (JSON)
          </Button>
        </a>
        <a href="/api/exportar-csv" className="flex-1">
          <Button variant="ghost" className="w-full">
            Exportar clientes (CSV)
          </Button>
        </a>
      </div>

      {!restaurando ? (
        <button type="button" className="text-xs font-semibold text-text-dim hover:text-text" onClick={() => setRestaurando(true)}>
          Restaurar de um backup
        </button>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-bg/30 p-3"
          action={(formData) =>
            iniciarTransicao(async () => {
              const resposta = await restaurarBackup(formData);
              setResultado(resposta.ok ? { ok: true, texto: "Dados restaurados com sucesso." } : { ok: false, texto: resposta.erro });
            })
          }
        >
          <p className="text-xs font-semibold text-danger">
            Restaurar substitui tudo o que está no app agora. Baixe um backup antes, por segurança.
          </p>
          <Textarea name="json" placeholder="Cole aqui o conteúdo do backup" className="min-h-32 font-mono text-xs" />
          <Field label='Digite "RESTAURAR" para confirmar'>
            <Input name="confirmacao" placeholder="RESTAURAR" />
          </Field>
          {resultado ? (
            <p className={resultado.ok ? "text-sm text-accent" : "text-sm text-danger"}>{resultado.texto}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setRestaurando(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={pendente} className="flex-1">
              {pendente ? "Restaurando…" : "Restaurar backup"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
