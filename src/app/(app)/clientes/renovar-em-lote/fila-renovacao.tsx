"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { brl, dataCurta } from "@/lib/format";
import { renovarComPlanoAtual, renovarVariosComPlanoAtual } from "./actions";

type ClienteFila = {
  id: string;
  nome: string;
  servicoNome: string | null;
  valorPlano: number;
  vencimento: string;
};

export function FilaRenovacao({ clientes }: { clientes: ClienteFila[] }) {
  const [fila, setFila] = useState(clientes);
  const [feitos, setFeitos] = useState(0);
  const [pendente, iniciarTransicao] = useTransition();

  if (fila.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-text-muted">Fila encerrada — {feitos} cliente(s) renovado(s).</p>
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
        {feitos} renovado(s) · {fila.length} restante(s)
      </p>

      <Card>
        <p className="text-lg font-bold text-text">{atual.nome}</p>
        <p className="text-sm text-text-dim">{atual.servicoNome ?? "—"}</p>
        <div className="mt-3 flex items-center justify-between">
          <Badge tone="warning">Vence {dataCurta(new Date(atual.vencimento))}</Badge>
          <span className="text-lg font-bold text-accent">{brl(atual.valorPlano)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button
            disabled={pendente}
            onClick={() =>
              iniciarTransicao(async () => {
                await renovarComPlanoAtual(atual.id);
                setFeitos((n) => n + 1);
                setFila((f) => f.slice(1));
              })
            }
          >
            {pendente ? "Renovando…" : `Renovar ${atual.nome}`}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" disabled={pendente} onClick={() => setFila((f) => f.slice(1))}>
              Pular este
            </Button>
            <Button variant="ghost" className="flex-1" disabled={pendente} onClick={() => setFila([])}>
              Encerrar fila
            </Button>
          </div>
        </div>
      </Card>

      {fila.length > 1 ? (
        <Button
          variant="ghost"
          disabled={pendente}
          onClick={() =>
            iniciarTransicao(async () => {
              const ids = fila.map((c) => c.id);
              await renovarVariosComPlanoAtual(ids);
              setFeitos((n) => n + ids.length);
              setFila([]);
            })
          }
        >
          Renovar todos os {fila.length} restantes de uma vez
        </Button>
      ) : null}
    </div>
  );
}
