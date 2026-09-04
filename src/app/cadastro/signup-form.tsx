"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { Button, Field, Input } from "@/components/ui";

export function SignupForm({ indicadoPorId }: { indicadoPorId?: string }) {
  const [erro, setErro] = useState<string | null>(null);
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
        <Input type="password" name="senha" autoComplete="new-password" minLength={6} required />
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
