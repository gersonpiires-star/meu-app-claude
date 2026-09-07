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

export function PublicarAvisoForm({ revendedores, cupons }: { revendedores: Revendedor[]; cupons: CupomOpcao[] }) {
  const [destinatarioId, setDestinatarioId] = useState("");
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [cupomEscolhidoId, setCupomEscolhidoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");

  function aoEscolherModelo(valor: string) {
    setModeloSelecionado(valor);
    setCupomEscolhidoId("");
    if (valor === "manual") {
      setTitulo(MENSAGEM_MANUAL.titulo);
      setMensagem(MENSAGEM_MANUAL.mensagem);
      return;
    }
    if (valor === "cupom") {
      // Espera a escolha do cupom específico no seletor que aparece abaixo —
      // limpa o título/mensagem até lá pra não publicar com código nenhum.
      setTitulo("");
      setMensagem("");
      return;
    }
    setTitulo("");
    setMensagem("");
  }

  function aoEscolherCupom(cupomId: string) {
    setCupomEscolhidoId(cupomId);
    const cupom = cupons.find((c) => c.id === cupomId);
    if (!cupom) {
      setTitulo("");
      setMensagem("");
      return;
    }
    const gerado = gerarMensagemCupom(cupom);
    setTitulo(gerado.titulo);
    setMensagem(gerado.mensagem);
    if (cupom.revendedorId) setDestinatarioId(cupom.revendedorId);
  }

  // Só pode publicar se: não escolheu o modelo de cupom, ou escolheu e já
  // selecionou um cupom específico dos disponíveis (nunca com o código em
  // branco). Sem nenhum cupom cadastrado, o fluxo de cupom fica travado.
  const precisaEscolherCupom = modeloSelecionado === "cupom";
  const publicarDesabilitado = precisaEscolherCupom && (cupons.length === 0 || !cupomEscolhidoId);

  return (
    <Card>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Publicar comunicado</p>
      <form action={publicarAviso} className="flex flex-col gap-3">
        <Field label="Modelos de mensagem — preencher automaticamente (opcional)">
          <Select value={modeloSelecionado} onChange={(e) => aoEscolherModelo(e.target.value)}>
            <option value="">Escrever mensagem livre</option>
            <option value="manual">Manual do usuário do GestorPro</option>
            <option value="cupom">Cupom de desconto</option>
          </Select>
        </Field>

        {precisaEscolherCupom ? (
          cupons.length > 0 ? (
            <Field label="Selecione o cupom">
              <Select value={cupomEscolhidoId} onChange={(e) => aoEscolherCupom(e.target.value)}>
                <option value="">Escolha um cupom disponível…</option>
                {cupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {formatarDesconto(c)}
                    {c.revendedorId ? " (restrito a um revendedor)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="-mt-1 text-xs font-semibold text-warning">
              Nenhum cupom cadastrado ainda — crie um em Cupons antes de publicar esse comunicado.
            </p>
          )
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
        <Button type="submit" disabled={publicarDesabilitado} className="w-full">
          Publicar
        </Button>
      </form>
    </Card>
  );
}
