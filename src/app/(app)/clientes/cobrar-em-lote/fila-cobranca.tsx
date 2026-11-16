"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { dataCurta } from "@/lib/format";
import { RegistrarCobrancaLink } from "../../painel/registrar-cobranca-link";
import { renovarComPlanoAtual } from "../renovar-em-lote/actions";

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
  const [renovados, setRenovados] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  if (fila.length === 0) {
    return (
      <Card className="text-center">
        <p className="text-sm text-text-muted">
          Fila encerrada — {feitos} cobrança(s) enviada(s){renovados > 0 ? `, ${renovados} renovação(ões)` : ""}.
        </p>
        <Link href="/clientes" className="mt-3 inline-block">
          <Button>Voltar pros clientes</Button>
        </Link>
      </Card>
    );
  }

  const atual = fila[0];

  function renovarEAvancar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await renovarComPlanoAtual(atual.id);
      if (resultado?.erro) {
        setErro(resultado.erro);
        return;
      }
      setRenovados((n) => n + 1);
      setFila((f) => f.slice(1));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-dim">
        {feitos} enviado(s) · {renovados} renovado(s) · {fila.length} restante(s)
      </p>

      <Card>
        <p className="text-lg font-bold text-text">{atual.nome}</p>
        <p className="text-sm text-text-dim">{atual.servicoNome ?? "—"}</p>
        <div className="mt-3">
          <Badge tone={atual.vencido ? "danger" : "warning"}>
            {atual.vencido ? "Vencido em" : "Vence"} {dataCurta(new Date(atual.vencimento))}
          </Badge>
        </div>

        {erro ? <p className="mt-3 text-sm text-danger">{erro}</p> : null}

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
          {/* Pro cliente que já pagou (ex: o revendedor viu o Pix cair) sem
          precisar abrir a fila separada de renovação em lote só pra esse. */}
          <Button variant="ghost" className="w-full" disabled={pendente} onClick={renovarEAvancar}>
            {pendente ? "Renovando…" : "Já pagou — marcar como pago e renovar"}
          </Button>
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
