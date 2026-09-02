"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { faixaVencimento } from "@/lib/planos";
import { linkWhatsApp, preencherModelo } from "@/lib/mensagens";
import { brl, dataCurta } from "@/lib/format";
import { publicarAvisoEmMassa } from "./actions";

type ClienteResumo = {
  id: string;
  nome: string;
  whatsapp: string | null;
  servicoId: string | null;
  servicoNome: string | null;
  valorPlano: number;
  status: string;
  vencimento: string;
};

const SITUACOES = [
  { chave: "todos", label: "Todos" },
  { chave: "ativos", label: "Ativos" },
  { chave: "vencendo", label: "Vencendo" },
  { chave: "vencidos", label: "Vencidos" },
] as const;

export function AvisoEmMassaClient({
  servicos,
  clientes,
  modelosComunicado,
}: {
  servicos: { id: string; nome: string }[];
  clientes: ClienteResumo[];
  modelosComunicado: Record<string, string>;
}) {
  const MODELOS_COMUNICADO = modelosComunicado;
  const [servicoFiltro, setServicoFiltro] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState<(typeof SITUACOES)[number]["chave"]>("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modelo, setModelo] = useState(Object.keys(MODELOS_COMUNICADO)[0]);
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState(MODELOS_COMUNICADO[Object.keys(MODELOS_COMUNICADO)[0]]);
  const [aplicarReajuste, setAplicarReajuste] = useState(false);
  const [novoValor, setNovoValor] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  const filtrados = useMemo(() => {
    return clientes.filter((c) => {
      if (servicoFiltro && c.servicoId !== servicoFiltro) return false;
      if (situacaoFiltro === "todos") return true;
      const faixa = faixaVencimento(new Date(c.vencimento));
      if (situacaoFiltro === "ativos") return faixa === "EM_DIA";
      if (situacaoFiltro === "vencendo") return faixa === "ATE_5_DIAS";
      if (situacaoFiltro === "vencidos") return faixa === "VENCIDO";
      return true;
    });
  }, [clientes, servicoFiltro, situacaoFiltro]);

  function alternarSelecionado(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const clientesSelecionados = clientes.filter((c) => selecionados.has(c.id));

  async function enviar() {
    const resultado = await publicarAvisoEmMassa({
      titulo,
      mensagem,
      servicoId: servicoFiltro || undefined,
      clienteIds: [...selecionados],
      novoValor: aplicarReajuste ? novoValor : undefined,
    });
    if (resultado.ok) setEnviado(true);
  }

  if (enviado) {
    return (
      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Enviar pelo WhatsApp</h2>
        <p className="mb-3 text-sm text-text-dim">
          Aviso registrado{aplicarReajuste ? " e valores atualizados" : ""}. Agora é só clicar em cada um pra
          enviar a mensagem no WhatsApp.
        </p>
        <div className="flex flex-col divide-y divide-border">
          {clientesSelecionados.map((c) => {
            const texto = preencherModelo(mensagem, { nome: c.nome, app: c.servicoNome ?? "" });
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-text">{c.nome}</span>
                {c.whatsapp ? (
                  <a href={linkWhatsApp(c.whatsapp, texto)} target="_blank" rel="noreferrer">
                    <Button variant="whatsapp">Enviar</Button>
                  </a>
                ) : (
                  <span className="text-xs text-text-dim">sem WhatsApp</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quem vai receber">
            <Select value={servicoFiltro} onChange={(e) => setServicoFiltro(e.target.value)}>
              <option value="">Todos os serviços</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Situação">
            <Select value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value as typeof situacaoFiltro)}>
              {SITUACOES.map((s) => (
                <option key={s.chave} value={s.chave}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Selecionados: {selecionados.size} de {filtrados.length}
          </p>
          <div className="flex gap-3 text-xs font-semibold">
            <button type="button" className="text-accent" onClick={() => setSelecionados(new Set(filtrados.map((c) => c.id)))}>
              Marcar todos
            </button>
            <button type="button" className="text-text-dim" onClick={() => setSelecionados(new Set())}>
              Limpar
            </button>
          </div>
        </div>

        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border">
          {filtrados.length === 0 ? (
            <p className="p-3 text-sm text-text-dim">Nenhum cliente nesse filtro.</p>
          ) : (
            filtrados.map((c) => (
              <label key={c.id} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0">
                <input
                  type="checkbox"
                  checked={selecionados.has(c.id)}
                  onChange={() => alternarSelecionado(c.id)}
                  className="h-4 w-4 rounded border-border-strong bg-bg-deep accent-accent"
                />
                <span className="flex-1 truncate text-sm text-text">{c.nome}</span>
                <Badge tone="neutral">{dataCurta(new Date(c.vencimento))}</Badge>
              </label>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Como o primeiro vai receber</h2>
        <div className="flex flex-col gap-3">
          <Field label="Modelo de mensagem">
            <Select
              value={modelo}
              onChange={(e) => {
                setModelo(e.target.value);
                setMensagem(MODELOS_COMUNICADO[e.target.value] ?? "");
              }}
            >
              {Object.keys(MODELOS_COMUNICADO).map((chave) => (
                <option key={chave} value={chave}>
                  {chave}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Título (fica salvo no seu histórico)">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Aumento de plano UniTv" />
          </Field>
          <Field label="Mensagem">
            <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="min-h-32" />
          </Field>
        </div>
      </Card>

      <Card>
        <label className="flex items-center gap-2 text-sm font-semibold text-text">
          <input
            type="checkbox"
            checked={aplicarReajuste}
            onChange={(e) => setAplicarReajuste(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong bg-bg-deep accent-accent"
          />
          Aplicar reajuste nesses clientes
        </label>
        <p className="mt-1 text-xs text-text-dim">Muda o valor do plano de quem está selecionado — use depois de avisar</p>
        {aplicarReajuste ? (
          <div className="mt-3">
            <Field label="Novo valor do plano (R$)">
              <Input type="number" min={0} step="0.01" value={novoValor} onChange={(e) => setNovoValor(Number(e.target.value))} />
            </Field>
            {clientesSelecionados.length > 0 ? (
              <p className="mt-1 text-xs text-text-dim">
                Ex: {clientesSelecionados[0].nome} era {brl(clientesSelecionados[0].valorPlano)} → fica {brl(novoValor)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Button
        disabled={pendente || selecionados.size === 0 || !titulo.trim() || !mensagem.trim()}
        onClick={() => iniciarTransicao(enviar)}
      >
        {pendente ? "Publicando…" : `Publicar para ${selecionados.size} selecionados`}
      </Button>
    </div>
  );
}
