"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { dataCurta } from "@/lib/format";
import { RegistrarCobrancaLink } from "../../painel/registrar-cobranca-link";

type ClienteFila = {
  id: string;
  nome: string;
  whatsapp: string;
  servicoNome: string | null;
  vencido: boolean;
  vencimento: string;
  mensagem: string;
};

export function FilaCobranca({ clientes }: { clientes: ClienteFila[] }) {
  const [fila, setFila] = useState(clientes);
  const [feitos, setFeitos] = useState(0);

  if (fila.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-text-muted">Fila encerrada — {feitos} cobrança(s) enviada(s).</p>
        <Link href="/clientes" className="mt-3 inline-block">
          <Button>Voltar pros clientes</Button>
        </Link>
      </Card>
    );
  }

  const atual = fila[0];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-dim">
        {feitos} enviado(s) · {fila.length} restante(s)
      </p>

      <Card>
        <p className="text-lg font-bold text-text">{atual.nome}</p>
        <p className="text-sm text-text-dim">{atual.servicoNome ?? "—"}</p>
        <div className="mt-3">
          <Badge tone={atual.vencido ? "danger" : "warning"}>
            {atual.vencido ? "Vencido em" : "Vence"} {dataCurta(new Date(atual.vencimento))}
          </Badge>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <RegistrarCobrancaLink
            clienteId={atual.id}
            whatsapp={atual.whatsapp}
            mensagem={atual.mensagem}
            modelo={atual.vencido ? "Vencido" : "Lembrete"}
            onEnviado={() => {
              setFeitos((n) => n + 1);
              setFila((f) => f.slice(1));
            }}
          >
            <Button variant="whatsapp" className="w-full">
              Enviar cobrança no WhatsApp
            </Button>
          </RegistrarCobrancaLink>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setFila((f) => f.slice(1))}>
              Pular este
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setFila([])}>
              Encerrar fila
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
