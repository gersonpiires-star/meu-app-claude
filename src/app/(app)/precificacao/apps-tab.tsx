"use client";

import { useTransition } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { atualizarConfigServico } from "./actions";

type Servico = {
  id: string;
  nome: string;
  plataformaId: string | null;
  custoCredito: number | null;
  cobrancaTelaExtra: number | null;
};

export function AppsTab({
  servicos,
  plataformas,
}: {
  servicos: Servico[];
  plataformas: { id: string; nome: string }[];
}) {
  if (servicos.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-dim">
          Nenhum serviço cadastrado ainda — os serviços aparecem aqui assim que você cadastrar um cliente
          com um serviço, ou cria eles direto ao cadastrar um cliente.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {servicos.map((s) => (
        <LinhaServico key={s.id} servico={s} plataformas={plataformas} />
      ))}
    </div>
  );
}

function LinhaServico({ servico, plataformas }: { servico: Servico; plataformas: { id: string; nome: string }[] }) {
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <Card>
      <form action={(formData) => iniciarTransicao(() => atualizarConfigServico(servico.id, formData))} className="flex flex-col gap-3">
        <p className="font-semibold text-text">{servico.nome}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Crédito (R$)">
            <Input type="number" name="custoCredito" min={0} step="0.01" defaultValue={servico.custoCredito ?? ""} />
          </Field>
          <Field label="Cobro por tela extra (R$)">
            <Input type="number" name="cobrancaTelaExtra" min={0} step="0.01" defaultValue={servico.cobrancaTelaExtra ?? ""} />
          </Field>
        </div>
        <Field label="Compra o crédito em">
          <Select name="plataformaId" defaultValue={servico.plataformaId ?? ""}>
            <option value="">Nenhuma plataforma</option>
            {plataformas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" variant="ghost" disabled={pendente} className="self-start">
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </Card>
  );
}
