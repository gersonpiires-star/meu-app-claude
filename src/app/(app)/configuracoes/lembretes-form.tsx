"use client";

import { useState, useTransition } from "react";
import { Button, Switch } from "@/components/ui";
import { salvarLembretesAutomaticos } from "./actions";

export function LembretesForm({
  lembreteAntesAtivo,
  avisoVencimentoAtivo,
  cobrancaAposVencerAtiva,
  whatsappConectado,
}: {
  lembreteAntesAtivo: boolean;
  avisoVencimentoAtivo: boolean;
  cobrancaAposVencerAtiva: boolean;
  whatsappConectado: boolean;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [salvo, setSalvo] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) =>
        iniciarTransicao(async () => {
          await salvarLembretesAutomaticos(formData);
          setSalvo(true);
        })
      }
    >
      {!whatsappConectado ? (
        <p className="rounded-lg border border-warning-border bg-warning-bg px-3 py-2 text-xs text-warning">
          Conecte o WhatsApp acima pra esses disparos automáticos funcionarem — sem isso, a preferência fica salva
          mas nada é enviado.
        </p>
      ) : null}
      <Switch
        name="lembreteAntesAtivo"
        defaultChecked={lembreteAntesAtivo}
        label="Lembrete 3 dias antes"
        sub="Envia a mensagem de lembrete antes do vencimento"
      />
      <Switch
        name="avisoVencimentoAtivo"
        defaultChecked={avisoVencimentoAtivo}
        label="Aviso no dia do vencimento"
        sub="Lembra o cliente no dia"
      />
      <Switch
        name="cobrancaAposVencerAtiva"
        defaultChecked={cobrancaAposVencerAtiva}
        label="Cobrança após vencer"
        sub="Repete a cobrança a cada 3 dias, por até 2 vezes"
      />
      {salvo ? <p className="text-sm text-accent">Preferências salvas.</p> : null}
      <Button type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando…" : "Salvar preferências"}
      </Button>
    </form>
  );
}
