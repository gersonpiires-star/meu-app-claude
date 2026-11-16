"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button, Field, Input } from "@/components/ui";

export function SignupForm({ indicadoPorId }: { indicadoPorId?: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  async function aoEnviar(formData: FormData) {
    setErro(null);
    const dados = {
      nome: String(formData.get("nome") ?? ""),
      cpf: String(formData.get("cpf") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      email: String(formData.get("email") ?? ""),
      senha: String(formData.get("senha") ?? ""),
      indicadoPorId,
      indicadoPorEmail: indicadoPorId ? undefined : String(formData.get("indicadoPorEmail") ?? "").trim() || undefined,
    };

    iniciarTransicao(async () => {
      const resposta = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setErro(corpo.error ?? "Não foi possível criar a conta");
        return;
      }

      await signIn("credentials", { email: dados.email, senha: dados.senha, redirectTo: "/" });
    });
  }

  return (
    <form className="flex flex-col gap-4" action={aoEnviar}>
      <Field label="Nome completo">
        <Input name="nome" autoComplete="name" required />
      </Field>
      <Field label="CPF">
        <Input name="cpf" inputMode="numeric" />
      </Field>
      <Field label="WhatsApp">
        <Input name="whatsapp" inputMode="tel" required />
      </Field>
      <Field label="E-mail">
        <Input type="email" name="email" autoComplete="email" required />
      </Field>
      <Field label="Senha">
        <div className="relative">
          <Input
            type={mostrarSenha ? "text" : "password"}
            name="senha"
            autoComplete="new-password"
            minLength={8}
            required
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-label={mostrarSenha ? "Esconder senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-dim hover:text-text"
          >
            {mostrarSenha ? (
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d="M3 3l14 14M8.3 8.4a2.2 2.2 0 0 0 3.1 3.1M6 5.4C3.7 6.7 2 9 2 10c0 1.3 3 5 8 5 1.3 0 2.5-.3 3.6-.8M14 5.5c2 1.2 4 3.3 4 4.5 0 .5-.4 1.4-1.1 2.4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M2 10c0-1 3-5 8-5s8 4 8 5-3 5-8 5-8-4-8-5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            )}
          </button>
        </div>
      </Field>
      {!indicadoPorId ? (
        <Field label="E-mail de quem te indicou (opcional)">
          <Input type="email" name="indicadoPorEmail" placeholder="deixe vazio se ninguém indicou" />
        </Field>
      ) : null}
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
