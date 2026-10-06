"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { migrarCredenciaisPagamento } from "./actions";

// Ação de manutenção única: converte mpAccessToken/asaasApiKey que ainda
// estejam em texto puro (salvos antes dessa versão) pro formato
// criptografado. Seguro clicar mais de uma vez — depois que tudo já estiver
// convertido, sempre mostra "0 de N".
export function MigrarCredenciaisButton() {
  const [resultado, setResultado] = useState<{ convertidos: number; total: number } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function rodar() {
    iniciarTransicao(async () => {
      const r = await migrarCredenciaisPagamento();
      setResultado(r);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="ghost" onClick={rodar} disabled={pendente} className="w-full">
        {pendente ? "Migrando…" : "Migrar credenciais de pagamento pra formato criptografado"}
      </Button>
      {resultado ? (
        <p className="text-xs text-text-dim">
          {resultado.convertidos} de {resultado.total} conta{resultado.total === 1 ? "" : "s"} convertida
          {resultado.convertidos === 1 ? "" : "s"} agora.
        </p>
      ) : null}
    </div>
  );
}
