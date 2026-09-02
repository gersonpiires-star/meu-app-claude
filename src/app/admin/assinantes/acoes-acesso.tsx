"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { liberarAcesso, pausarAcesso } from "../actions";

export function AcoesAcesso({ revendedorId }: { revendedorId: string }) {
  const [pendente, iniciarTransicao] = useTransition();

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
          if (confirm("Pausar o acesso deste assinante?")) iniciarTransicao(() => pausarAcesso(revendedorId));
        }}
      >
        Pausar acesso
      </Button>
    </div>
  );
}
