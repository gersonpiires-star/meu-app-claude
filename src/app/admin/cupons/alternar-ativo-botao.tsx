"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { alternarCupomAtivo } from "./actions";

export function AlternarAtivoBotao({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciarTransicao] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      disabled={pendente}
      onClick={() => iniciarTransicao(() => alternarCupomAtivo(id, !ativo))}
    >
      {pendente ? "…" : ativo ? "Desativar" : "Reativar"}
    </Button>
  );
}
