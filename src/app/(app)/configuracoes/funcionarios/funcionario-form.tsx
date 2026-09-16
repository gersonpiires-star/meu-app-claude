"use client";

import { useRef, useState, useTransition } from "react";
import { Badge, Button, Field, Input } from "@/components/ui";
import { alternarFuncionarioAtivo, alternarPermissaoFuncionario, criarFuncionario, excluirFuncionario } from "./actions";

type Funcionario = { id: string; nome: string; email: string; ativo: boolean; podeExcluir: boolean; podeVerFinanceiro: boolean };

export function FuncionarioForm({ funcionarios }: { funcionarios: Funcionario[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      {funcionarios.length === 0 ? (
        <p className="text-sm text-text-dim">Nenhum funcionário cadastrado ainda.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {funcionarios.map((f) => (
            <div key={f.id} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{f.nome}</p>
                  <p className="truncate text-xs text-text-dim">{f.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={f.ativo ? "accent" : "neutral"}>{f.ativo ? "Ativo" : "Bloqueado"}</Badge>
                  <button
                    type="button"
                    className="text-xs font-semibold text-text-dim hover:text-text"
                    disabled={pendente}
                    onClick={() => iniciarTransicao(() => alternarFuncionarioAtivo(f.id, !f.ativo))}
                  >
                    {f.ativo ? "Bloquear" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-text-dim hover:text-danger"
                    disabled={pendente}
                    onClick={() => iniciarTransicao(() => excluirFuncionario(f.id))}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-xs text-text-dim">
                  <input
                    type="checkbox"
                    checked={f.podeExcluir}
                    disabled={pendente}
                    onChange={(e) => iniciarTransicao(() => alternarPermissaoFuncionario(f.id, "podeExcluir", e.target.checked))}
                    className="h-3.5 w-3.5 rounded border-border-strong accent-accent"
                  />
                  Pode excluir cadastros
                </label>
                <label className="flex items-center gap-1.5 text-xs text-text-dim">
                  <input
                    type="checkbox"
                    checked={f.podeVerFinanceiro}
                    disabled={pendente}
                    onChange={(e) => iniciarTransicao(() => alternarPermissaoFuncionario(f.id, "podeVerFinanceiro", e.target.checked))}
                    className="h-3.5 w-3.5 rounded border-border-strong accent-accent"
                  />
                  Pode ver o financeiro
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        className="flex flex-col gap-3 rounded-xl border border-border-strong p-3"
        action={(formData) =>
          iniciarTransicao(async () => {
            setErro(null);
            const resultado = await criarFuncionario(formData);
            if (resultado?.erro) {
              setErro(resultado.erro);
              return;
            }
            formRef.current?.reset();
          })
        }
      >
        <Field label="Nome">
          <Input name="nome" required />
        </Field>
        <Field label="E-mail de acesso">
          <Input type="email" name="email" required />
        </Field>
        <Field label="Senha">
          <Input type="password" name="senha" minLength={6} required />
        </Field>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-xs text-text-dim">
            <input type="checkbox" name="podeExcluir" className="h-3.5 w-3.5 rounded border-border-strong accent-accent" />
            Pode excluir cadastros
          </label>
          <label className="flex items-center gap-1.5 text-xs text-text-dim">
            <input type="checkbox" name="podeVerFinanceiro" className="h-3.5 w-3.5 rounded border-border-strong accent-accent" />
            Pode ver o financeiro
          </label>
        </div>
        {erro ? <p className="text-xs text-danger">{erro}</p> : null}
        <Button type="submit" disabled={pendente}>
          {pendente ? "Adicionando…" : "Adicionar funcionário"}
        </Button>
      </form>
    </div>
  );
}
