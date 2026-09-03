"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import { criarInteressado } from "./actions";

export function InteressadoForm({ servicos }: { servicos: string[] }) {
  const [interesse, setInteresse] = useState("");
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border-strong bg-surface p-4"
      action={(formData) => iniciarTransicao(() => criarInteressado(formData))}
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
        <Link href="/clientes?aba=interessados" className="flex-1">
          <Button type="button" variant="ghost" className="w-full">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
