"use client";

import { useTransition } from "react";
import { Button, Field, Input, Select } from "@/components/ui";

const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"];

export function VendaForm({
  acao,
  produtos,
}: {
  acao: (formData: FormData) => Promise<void>;
  produtos: { id: string; modelo: string }[];
}) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form className="flex flex-col gap-4" action={(formData) => iniciarTransicao(() => acao(formData))}>
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
        <Field label="Qtde">
          <Input type="number" name="quantidade" min={1} defaultValue={1} required />
        </Field>
        <Field label="Valor unit. (R$)">
          <Input type="number" name="valorUnitario" min={0} step="0.01" required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Forma de pagamento">
          <Select name="formaPagamento" defaultValue={FORMAS_PAGAMENTO[0]}>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Taxa (%)">
          <Input type="number" name="taxaPercentual" min={0} step="0.01" defaultValue={0} />
        </Field>
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
