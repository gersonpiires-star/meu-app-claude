"use client";

import { useTransition } from "react";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { criarChavePix, excluirChavePix } from "./chaves-pix-actions";

const TIPOS = ["E-mail", "Telefone", "CPF", "CNPJ", "Aleatória"];

export function ChavesPixForm({ chaves }: { chaves: { id: string; tipo: string; valor: string }[] }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {chaves.length === 0 ? (
        <p className="text-sm text-text-dim">Nenhuma chave cadastrada ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {chaves.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <div>
                <Badge tone="neutral">{c.tipo}</Badge>
                <span className="ml-2 text-sm text-text">{c.valor}</span>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-text-dim hover:text-danger"
                disabled={pendente}
                onClick={() => iniciarTransicao(() => excluirChavePix(c.id))}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        className="flex flex-col gap-3 rounded-xl border border-border-strong p-3"
        action={(formData) => iniciarTransicao(() => criarChavePix(formData))}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select name="tipo" defaultValue={TIPOS[0]}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Chave">
            <Input name="valor" placeholder="voce@email.com" required />
          </Field>
        </div>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar chave"}
        </Button>
      </form>
    </div>
  );
}
