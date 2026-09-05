"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { publicarAviso } from "../actions";

type Revendedor = { id: string; nome: string; email: string };
type CupomOpcao = { id: string; codigo: string; tipo: "PERCENTUAL" | "FIXO"; valor: number; revendedorId: string | null };

function formatarDesconto(cupom: CupomOpcao) {
  return cupom.tipo === "PERCENTUAL" ? `${cupom.valor}%` : `R$ ${cupom.valor.toFixed(2).replace(".", ",")}`;
}

function gerarMensagemCupom(cupom: CupomOpcao) {
  return {
    titulo: "Você ganhou um cupom de desconto!",
    mensagem: `Você recebeu um cupom de ${formatarDesconto(cupom)} de desconto na sua próxima renovação do GestorPro. Use o código ${cupom.codigo} na hora de renovar sua assinatura e garanta o benefício antes que ele expire. Qualquer dúvida, estamos à disposição!`,
  };
}

export function PublicarAvisoForm({ revendedores, cupons }: { revendedores: Revendedor[]; cupons: CupomOpcao[] }) {
  const [destinatarioId, setDestinatarioId] = useState("");
  const [cupomId, setCupomId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");

  function aoEscolherCupom(id: string) {
    setCupomId(id);
    const cupom = cupons.find((c) => c.id === id);
    if (!cupom) return;
    const gerado = gerarMensagemCupom(cupom);
    setTitulo(gerado.titulo);
    setMensagem(gerado.mensagem);
    if (cupom.revendedorId) setDestinatarioId(cupom.revendedorId);
  }

  return (
    <Card>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Publicar comunicado</p>
      <form action={publicarAviso} className="flex flex-col gap-3">
        {cupons.length > 0 ? (
          <Field label="Cupons — preencher mensagem automaticamente (opcional)">
            <Select value={cupomId} onChange={(e) => aoEscolherCupom(e.target.value)}>
              <option value="">Escrever mensagem livre</option>
              {cupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {formatarDesconto(c)}
                  {c.revendedorId ? " (restrito a um revendedor)" : ""}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Destinatário">
          <Select name="destinatarioId" value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)}>
            <option value="">Todos os revendedores</option>
            {revendedores.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} — {r.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Título">
          <Input name="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </Field>
        <Field label="Mensagem">
          <Textarea name="mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full">
          Publicar
        </Button>
      </form>
    </Card>
  );
}
