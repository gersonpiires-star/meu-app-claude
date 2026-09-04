"use client";

import { useState, useTransition } from "react";

export function VincularCliente({
  vendaId,
  clientes,
  acao,
}: {
  vendaId: string;
  clientes: { id: string; nome: string }[];
  acao: (vendaId: string, clienteId: string) => Promise<{ erro: string } | undefined>;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-0.5">
      <select
        defaultValue=""
        disabled={pendente || clientes.length === 0}
        onChange={(e) => {
          const clienteId = e.target.value;
          if (!clienteId) return;
          setErro(null);
          iniciarTransicao(async () => {
            const resultado = await acao(vendaId, clienteId);
            if (resultado?.erro) setErro(resultado.erro);
          });
        }}
        className="max-w-[150px] truncate rounded-lg border border-border-strong bg-surface-2 px-1.5 py-1 text-[11px] text-text-dim"
      >
        <option value="">{pendente ? "Vinculando…" : "Vincular cliente…"}</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>
      {erro ? <span className="text-[10px] font-semibold text-danger">{erro}</span> : null}
    </div>
  );
}
