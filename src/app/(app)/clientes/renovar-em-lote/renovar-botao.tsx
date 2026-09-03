"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { renovarComPlanoAtual } from "./actions";

export function RenovarBotao({
  clienteId,
  className,
  label = "Renovar",
  labelPendente = "Renovando…",
  labelFeito = "Renovado ✓",
}: {
  clienteId: string;
  className?: string;
  label?: string;
  labelPendente?: string;
  labelFeito?: string;
}) {
  const [feito, setFeito] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (feito) {
    return (
      <Button variant="ghost" className={className} disabled>
        {labelFeito}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className={className}
      disabled={pendente}
      onClick={() =>
        iniciarTransicao(async () => {
          await renovarComPlanoAtual(clienteId);
          setFeito(true);
        })
      }
    >
      {pendente ? labelPendente : label}
    </Button>
  );
}
