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

const MENSAGEM_MANUAL = {
  titulo: "Conheça o manual do GestorPro",
  mensagem:
    'Oi! O GestorPro tem um manual completo de uso, disponível direto no menu do app em "Manual do app" (no celular aparece como "Manual"). Qualquer dúvida, é só consultar por lá!',
};

const MENSAGEM_CUPOM_GENERICO = {
  titulo: "Você ganhou um cupom de desconto!",
  mensagem:
    "Você recebeu um cupom de desconto na sua próxima renovação do GestorPro. Use o código [CÓDIGO] na hora de renovar sua assinatura e garanta o benefício antes que ele expire. Qualquer dúvida, estamos à disposição!",
};

export function PublicarAvisoForm({ revendedores, cupons }: { revendedores: Revendedor[]; cupons: CupomOpcao[] }) {
  const [destinatarioId, setDestinatarioId] = useState("");
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");

  function aoEscolherModelo(valor: string) {
    setModeloSelecionado(valor);
    if (valor === "manual") {
      setTitulo(MENSAGEM_MANUAL.titulo);
      setMensagem(MENSAGEM_MANUAL.mensagem);
      return;
    }
    if (valor === "cupom-generico") {
      setTitulo(MENSAGEM_CUPOM_GENERICO.titulo);
      setMensagem(MENSAGEM_CUPOM_GENERICO.mensagem);
      return;
    }
    const cupom = cupons.find((c) => c.id === valor);
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
        <Field label="Modelos de mensagem — preencher automaticamente (opcional)">
          <Select value={modeloSelecionado} onChange={(e) => aoEscolherModelo(e.target.value)}>
            <option value="">Escrever mensagem livre</option>
            <option value="manual">Manual do usuário do GestorPro</option>
            <option value="cupom-generico">Cupom de desconto</option>
            {cupons.length > 0 ? (
              <optgroup label="Cupons cadastrados">
                {cupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {formatarDesconto(c)}
                    {c.revendedorId ? " (restrito a um revendedor)" : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        </Field>
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
