"use client";

import { useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PLANO_LABEL, PLANO_VALOR_SUGERIDO } from "@/lib/planos";
import type { PlanoCliente } from "@/generated/prisma/enums";

const PLANOS: PlanoCliente[] = ["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"];

type Servico = { id: string; nome: string; custoCredito: number | null };

type ValoresIniciais = {
  nome?: string;
  cpf?: string | null;
  whatsapp?: string | null;
  servicoId?: string | null;
  telas?: number;
  plano?: PlanoCliente;
  valorPlano?: number;
  diaFixo?: number | null;
  testeGratis?: boolean;
  anotacao?: string | null;
  indicadoPorId?: string | null;
};

export function ClienteForm({
  acao,
  valoresIniciais,
  servicos,
  clientesParaIndicacao = [],
  textoBotao = "Salvar cliente",
  interessadoId,
}: {
  acao: (formData: FormData) => Promise<{ ok: false; erro: string } | void>;
  valoresIniciais?: ValoresIniciais;
  servicos: Servico[];
  clientesParaIndicacao?: { id: string; nome: string }[];
  textoBotao?: string;
  interessadoId?: string;
}) {
  const [plano, setPlano] = useState<PlanoCliente>(valoresIniciais?.plano ?? "MENSAL");
  const [valor, setValor] = useState<number>(valoresIniciais?.valorPlano ?? PLANO_VALOR_SUGERIDO.MENSAL);
  const [servicoId, setServicoId] = useState<string>(valoresIniciais?.servicoId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      action={(formData) =>
        iniciarTransicao(async () => {
          const resultado = await acao(formData);
          if (resultado?.ok === false) setErro(resultado.erro);
        })
      }
    >
      {interessadoId ? <input type="hidden" name="interessadoId" value={interessadoId} /> : null}
      <Field label="Nome">
        <Input name="nome" defaultValue={valoresIniciais?.nome} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF">
          <Input name="cpf" defaultValue={valoresIniciais?.cpf ?? ""} inputMode="numeric" />
        </Field>
        <Field label="WhatsApp">
          <Input name="whatsapp" defaultValue={valoresIniciais?.whatsapp ?? ""} inputMode="tel" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Serviço (app)">
          <Select name="servicoId" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
            <option value="">Nenhum</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
          {servicos.length === 0 ? (
            <p className="mt-1 text-xs text-text-dim">
              Nenhum app cadastrado ainda — cadastre em Plataformas antes de vincular a um cliente.
            </p>
          ) : null}
        </Field>
        <Field label="Quantas telas">
          <Input type="number" name="telas" min={1} defaultValue={valoresIniciais?.telas ?? 1} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Plano">
          <Select
            name="plano"
            value={plano}
            onChange={(e) => {
              const novoPlano = e.target.value as PlanoCliente;
              setPlano(novoPlano);
              setValor(PLANO_VALOR_SUGERIDO[novoPlano]);
            }}
          >
            {PLANOS.map((p) => (
              <option key={p} value={p}>
                {PLANO_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Valor do plano (R$)">
          <Input
            type="number"
            name="valorPlano"
            min={0}
            step="0.01"
            value={valor}
            onChange={(e) => setValor(Number(e.target.value))}
            required
          />
        </Field>
      </div>

      {clientesParaIndicacao.length > 0 ? (
        <Field label="Indicado por (opcional)">
          <Select name="indicadoPorId" defaultValue={valoresIniciais?.indicadoPorId ?? ""}>
            <option value="">Ninguém indicou / não sei</option>
            {clientesParaIndicacao.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field label="Dia fixo de vencimento (opcional)">
        <Input
          type="number"
          name="diaFixo"
          min={1}
          max={31}
          defaultValue={valoresIniciais?.diaFixo ?? ""}
          placeholder="vazio = segue os dias do plano"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input
          type="checkbox"
          name="testeGratis"
          defaultChecked={valoresIniciais?.testeGratis}
          className="h-4 w-4 rounded border-border-strong bg-bg-deep accent-accent"
        />
        Teste grátis — sem cobrança, prazo curto
      </label>

      <Field label="Anotação">
        <Textarea name="anotacao" defaultValue={valoresIniciais?.anotacao ?? ""} />
      </Field>

      {erro ? <p className="text-sm font-semibold text-danger">{erro}</p> : null}

      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? "Salvando…" : textoBotao}
      </Button>
    </form>
  );
}
