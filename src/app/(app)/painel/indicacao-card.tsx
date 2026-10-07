"use client";

import { useState } from "react";
import { Badge, Button, Card, Input, buttonClassName } from "@/components/ui";

export function IndicacaoCard({
  link,
  cliques,
  assinantes,
}: {
  link: string;
  cliques: number;
  assinantes: number;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard indisponível — o campo já fica selecionado ao focar,
      // dá pra copiar na mão (mesmo fallback do LinkIndicacao em Configurações).
    }
  }

  // Sem número de telefone: abre o seletor de contato do próprio WhatsApp
  // do revendedor, pra ele escolher pra quem mandar — diferente de
  // linkWhatsApp() em lib/mensagens.ts, que manda pra um contato específico.
  const mensagem = `Uso o GestorPro pra organizar minha revenda de streaming (clientes, cobrança, estoque) — tem 7 dias grátis pra testar: ${link}`;
  const linkCompartilhar = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-text">Indique e ganhe 15%</span>
        <Badge tone="accent">Indicação</Badge>
      </div>
      <p className="text-xs text-text-dim">
        Quando alguém assina o primeiro plano pago pelo seu link, você ganha um cupom de 15% de desconto na sua
        próxima renovação.
      </p>
      <div className="flex gap-2">
        <Input readOnly value={link} onFocus={(e) => e.target.select()} className="flex-1 text-xs" />
        <Button type="button" variant="ghost" onClick={copiar} className="shrink-0">
          {copiado ? "Copiado!" : "Copiar"}
        </Button>
      </div>
      <a href={linkCompartilhar} target="_blank" rel="noreferrer" className={buttonClassName("whatsapp", "w-full justify-center")}>
        Compartilhar no WhatsApp
      </a>
      {cliques > 0 ? (
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-center">
          <div>
            <p className="text-lg font-bold text-text">{cliques}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Cliques no link</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent">{assinantes}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Assinaram</p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
