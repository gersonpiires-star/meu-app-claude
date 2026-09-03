"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import { criarInteressado } from "./actions";

export function InteressadoForm({
  total,
  paraRetornarHoje,
  servicos,
}: {
  total: number;
  paraRetornarHoje: number;
  servicos: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [interesse, setInteresse] = useState("");
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text">Interessados</h1>
          <p className="text-xs text-text-dim">
            {total} na lista · {paraRetornarHoje} para retornar hoje
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-xl font-bold text-bg-deep transition hover:brightness-110"
          aria-label="Novo interessado"
        >
          +
        </button>
      </div>

      {aberto ? (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-surface p-4"
          action={(formData) =>
            iniciarTransicao(async () => {
              await criarInteressado(formData);
              setAberto(false);
              setInteresse("");
            })
          }
        >
          <p className="text-sm font-bold text-text">Quem chamou?</p>

          <Field label="Nome">
            <Input name="nome" placeholder="Nome do interessado" required />
          </Field>

          <Field label="WhatsApp">
            <Input name="whatsapp" placeholder="47 99999-9999" inputMode="tel" />
          </Field>

          {servicos.length > 0 ? (
            <Field label="Interesse">
              <input type="hidden" name="interesse" value={interesse} />
              <div className="flex flex-wrap gap-2">
                {servicos.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInteresse(interesse === s ? "" : s)}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      interesse === s ? "border-accent bg-accent-soft text-accent" : "border-border-strong text-text-dim hover:text-text"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}

          <Field label="Retornar em (DD/MM/AAAA)">
            <Input name="retornarEm" placeholder="deixe vazio se não marcou" />
          </Field>

          <Field label="Observação">
            <Textarea name="observacao" placeholder="Achou caro, vai pensar, pediu teste…" />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" disabled={pendente} className="flex-1">
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
