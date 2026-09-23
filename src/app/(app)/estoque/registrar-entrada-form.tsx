"use client";

import { useState, useTransition } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";

export function RegistrarEntradaForm({
  produtos,
  acao,
}: {
  produtos: { id: string; modelo: string }[];
  acao: (formData: FormData) => Promise<void>;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [feito, setFeito] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-text">Registrar entrada</h2>
      <form
        className="flex flex-col gap-3"
        action={(formData) =>
          iniciarTransicao(async () => {
            await acao(formData);
            setFeito(true);
            setTimeout(() => setFeito(false), 2000);
          })
        }
      >
        <Field label="Produto">
          <Select name="produtoId" required defaultValue="">
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade">
            <Input type="number" name="quantidade" min={1} defaultValue={1} required />
          </Field>
          <Field label="Custo por unidade">
            <Input type="number" name="custoUnitario" min={0} step="0.01" defaultValue={0} required />
          </Field>
        </div>
        <Field label="Fornecedor">
          <Input name="fornecedor" placeholder="Onde comprou" />
        </Field>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : feito ? "✓ Salvo" : "Salvar entrada"}
        </Button>
      </form>
    </Card>
  );
}
