"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { publicarAviso } from "../actions";

type Revendedor = { id: string; nome: string; email: string; statusAssinatura: "TRIAL" | "ATIVO" | "PAUSADO" | "CANCELADO" };
type CupomOpcao = { id: string; codigo: string; tipo: "PERCENTUAL" | "FIXO"; valor: number; revendedorId: string | null };

function formatarDesconto(cupom: CupomOpcao) {
  return cupom.tipo === "PERCENTUAL" ? `${cupom.valor}%` : `R$ ${cupom.valor.toFixed(2).replace(".", ",")}`;
}

// Mandando pra um revendedor específico, a mensagem chama pelo primeiro
// nome — pra todo mundo, mantém o "Oi!" genérico de sempre.
function saudacao(revendedorAlvo: Revendedor | null) {
  if (!revendedorAlvo) return "Oi!";
  const primeiroNome = revendedorAlvo.nome.trim().split(/\s+/)[0];
  return `Oi, ${primeiroNome}!`;
}

// Quem ainda está em teste grátis nunca pagou pelo GestorPro — falar em
// "renovar" pra essa pessoa não faz sentido (não tem o que renovar ainda).
// Cupom restrito a um revendedor específico: olha o status dele de verdade.
// Cupom pra todo mundo: usa uma frase que serve tanto pra quem já paga
// quanto pra quem ainda vai assinar pela primeira vez.
function gerarMensagemCupom(cupom: CupomOpcao, revendedorAlvo: Revendedor | null) {
  const desconto = formatarDesconto(cupom);
  const titulo = "Você ganhou um cupom de desconto!";
  const saud = saudacao(revendedorAlvo);

  if (revendedorAlvo) {
    const nuncaAssinou = revendedorAlvo.statusAssinatura === "TRIAL";
    const acao = nuncaAssinou ? "assinar" : "renovar sua assinatura";
    const contexto = nuncaAssinou ? "pra assinar o GestorPro" : "na sua próxima renovação do GestorPro";
    return {
      titulo,
      mensagem: `${saud} Você recebeu um cupom de ${desconto} de desconto ${contexto}. Use o código ${cupom.codigo} na hora de ${acao} e garanta o benefício antes que ele expire. Qualquer dúvida, estamos à disposição!`,
    };
  }

  return {
    titulo,
    mensagem: `${saud} Você recebeu um cupom de ${desconto} de desconto no GestorPro. Use o código ${cupom.codigo} na hora de assinar ou renovar sua assinatura e garanta o benefício antes que ele expire. Qualquer dúvida, estamos à disposição!`,
  };
}

function gerarMensagemManual(revendedorAlvo: Revendedor | null) {
  return {
    titulo: "Conheça o manual do GestorPro",
    mensagem: `${saudacao(revendedorAlvo)} O GestorPro tem um manual completo de uso, disponível direto no menu do app em "Manual do app" (no celular aparece como "Manual"). Qualquer dúvida, é só consultar por lá!`,
  };
}

export function PublicarAvisoForm({ revendedores, cupons }: { revendedores: Revendedor[]; cupons: CupomOpcao[] }) {
  const [destinatarioId, setDestinatarioId] = useState("");
  const [modeloSelecionado, setModeloSelecionado] = useState("");
  const [cupomEscolhidoId, setCupomEscolhidoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");

  const tipo = modeloSelecionado === "atualizacao" ? "ATUALIZACAO" : "GERAL";

  const revendedorSelecionado = destinatarioId ? (revendedores.find((r) => r.id === destinatarioId) ?? null) : null;

  function aoEscolherModelo(valor: string) {
    setModeloSelecionado(valor);
    setCupomEscolhidoId("");
    if (valor === "manual") {
      const gerado = gerarMensagemManual(revendedorSelecionado);
      setTitulo(gerado.titulo);
      setMensagem(gerado.mensagem);
      return;
    }
    if (valor === "atualizacao") {
      // Título já vem pronto — a mensagem descrevendo o que mudou é escrita
      // na hora, específica de cada atualização (não dá pra ter um modelo
      // fixo pra isso).
      setTitulo("Atualização do GestorPro");
      setMensagem("");
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
    // Cupom restrito a um revendedor: a saudação é sempre dele. Cupom livre:
    // respeita o destinatário já escolhido no seletor abaixo, se houver.
    const revendedorAlvo = cupom.revendedorId
      ? (revendedores.find((r) => r.id === cupom.revendedorId) ?? null)
      : revendedorSelecionado;
    const gerado = gerarMensagemCupom(cupom, revendedorAlvo);
    setTitulo(gerado.titulo);
    setMensagem(gerado.mensagem);
    if (cupom.revendedorId) setDestinatarioId(cupom.revendedorId);
  }

  // Trocar o destinatário depois de já ter um modelo escolhido também deve
  // atualizar a saudação da mensagem — sem isso, dava pra escolher "Cleiton"
  // e continuar publicando com o "Oi!" genérico de antes.
  function aoEscolherDestinatario(id: string) {
    setDestinatarioId(id);
    const revendedorAlvo = id ? (revendedores.find((r) => r.id === id) ?? null) : null;

    if (modeloSelecionado === "manual") {
      const gerado = gerarMensagemManual(revendedorAlvo);
      setTitulo(gerado.titulo);
      setMensagem(gerado.mensagem);
      return;
    }
    if (modeloSelecionado === "cupom" && cupomEscolhidoId) {
      const cupom = cupons.find((c) => c.id === cupomEscolhidoId);
      if (cupom && !cupom.revendedorId) {
        const gerado = gerarMensagemCupom(cupom, revendedorAlvo);
        setTitulo(gerado.titulo);
        setMensagem(gerado.mensagem);
      }
    }
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
        <input type="hidden" name="tipo" value={tipo} />
        <Field label="Modelos de mensagem — preencher automaticamente (opcional)">
          <Select value={modeloSelecionado} onChange={(e) => aoEscolherModelo(e.target.value)}>
            <option value="">Escrever mensagem livre</option>
            <option value="atualizacao">Atualização do sistema</option>
            <option value="manual">Manual do usuário do GestorPro</option>
            <option value="cupom">Cupom de desconto</option>
          </Select>
        </Field>

        {modeloSelecionado === "atualizacao" ? (
          <p className="-mt-1 text-xs text-text-dim">
            Recebe o selo &quot;Atualização&quot; no sininho de todo mundo — descreva abaixo o que mudou nessa versão.
          </p>
        ) : null}

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
          <Select name="destinatarioId" value={destinatarioId} onChange={(e) => aoEscolherDestinatario(e.target.value)}>
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
