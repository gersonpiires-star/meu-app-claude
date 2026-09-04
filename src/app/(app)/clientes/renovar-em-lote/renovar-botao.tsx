"use client";

import { useState, useTransition } from "react";
import { Button, cx } from "@/components/ui";
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
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (feito) {
    return (
      <Button variant="ghost" className={cx("w-full whitespace-nowrap", className)} disabled>
        {labelFeito}
      </Button>
    );
  }

  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <Button
        variant="ghost"
        className="w-full whitespace-nowrap"
        disabled={pendente}
        onClick={() =>
          iniciarTransicao(async () => {
            setErro(null);
            const resultado = await renovarComPlanoAtual(clienteId);
            if (resultado?.erro) setErro(resultado.erro);
            else setFeito(true);
          })
        }
      >
        {pendente ? labelPendente : label}
      </Button>
      {erro ? <p className="text-[10px] font-semibold text-danger">{erro}</p> : null}
    </div>
  );
}
