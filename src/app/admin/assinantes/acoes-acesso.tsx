"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { liberarAcesso, pausarAcesso, retomarAcesso } from "../actions";

export function AcoesAcesso({ revendedorId, statusAssinatura }: { revendedorId: string; statusAssinatura: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  if (statusAssinatura === "PAUSADO") {
    return (
      <Button disabled={pendente} onClick={() => iniciarTransicao(() => retomarAcesso(revendedorId))}>
        Retomar acesso
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pendente} onClick={() => iniciarTransicao(() => liberarAcesso(revendedorId, 1))}>
        Liberar +1 mês
      </Button>
      <Button
        variant="ghost"
        disabled={pendente}
        onClick={() => iniciarTransicao(() => liberarAcesso(revendedorId, 12))}
      >
        Liberar +12 meses
      </Button>
      <Button
        variant="danger"
        disabled={pendente}
        onClick={() => {
          const motivo = prompt("Motivo da pausa:");
          if (motivo && motivo.trim()) iniciarTransicao(() => pausarAcesso(revendedorId, motivo));
        }}
      >
        Pausar acesso
      </Button>
    </div>
  );
}
