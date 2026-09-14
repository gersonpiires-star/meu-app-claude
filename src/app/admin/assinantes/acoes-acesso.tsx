"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { liberarAcesso, pausarAcesso, retomarAcesso } from "../actions";

export function AcoesAcesso({ revendedorId, statusAssinatura }: { revendedorId: string; statusAssinatura: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  // Pergunta o valor recebido (ex: Pix direto no WhatsApp) antes de liberar.
  // Cancelar o prompt cancela a liberação inteira; deixar em branco e
  // confirmar libera sem registrar pagamento (cortesia) — mesmo
  // comportamento de antes. Informando um valor, ele entra na Receita da
  // plataforma e no histórico de pagamentos do assinante.
  function liberar(meses: number) {
    const texto = prompt("Valor recebido nesse pagamento (ex: 30) — deixe em branco se for cortesia, sem cobrança:");
    if (texto === null) return;
    const limpo = texto.trim();
    let valor: number | undefined;
    if (limpo !== "") {
      valor = Number(limpo.replace(",", "."));
      if (Number.isNaN(valor) || valor < 0) {
        alert("Valor inválido — liberação cancelada.");
        return;
      }
    }
    iniciarTransicao(() => liberarAcesso(revendedorId, meses, valor));
  }

  if (statusAssinatura === "PAUSADO") {
    return (
      <Button disabled={pendente} onClick={() => iniciarTransicao(() => retomarAcesso(revendedorId))}>
        Retomar acesso
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pendente} onClick={() => liberar(1)}>
        Liberar +1 mês
      </Button>
      <Button variant="ghost" disabled={pendente} onClick={() => liberar(12)}>
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
