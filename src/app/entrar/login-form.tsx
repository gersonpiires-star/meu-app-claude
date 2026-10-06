"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const router = useRouter();

  function aoEnviar(formData: FormData) {
    setErro(null);
    const email = String(formData.get("email") ?? "");
    const senha = String(formData.get("senha") ?? "");
    // Precisa passar pelo signIn do cliente (next-auth/react), não pela
    // server action antiga: só assim a requisição passa pela rota
    // /api/auth/callback/credentials, onde api/auth/[...nextauth]/route.ts
    // decide — a partir desse campo — se o cookie de sessão expira ao
    // fechar o navegador (padrão) ou fica salvo (marcado "manter conectado").
    const lembrar = formData.get("lembrar") === "on" ? "true" : "false";

    iniciarTransicao(async () => {
      const resultado = await signIn("credentials", { email, senha, lembrar, redirect: false });
      if (resultado?.error) {
        setErro("E-mail ou senha incorretos");
        return;
      }
      // refresh() depois do push: a sessão mudou (login novo), então os
      // Server Components já renderizados (inclusive o próprio layout) não
      // podem continuar servindo a versão anônima em cache.
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form className="flex flex-col gap-4" action={aoEnviar}>
      <Field label="E-mail">
        <Input type="email" name="email" autoComplete="email" required />
      </Field>
      <Field label="Senha">
        <Input type="password" name="senha" autoComplete="current-password" required />
      </Field>
      <label className="flex items-center gap-1.5 text-xs text-text-dim">
        <input type="checkbox" name="lembrar" className="h-3.5 w-3.5 rounded border-border-strong accent-accent" />
        Manter conectado neste aparelho
      </label>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <Button type="submit" disabled={pendente} className="mt-1 w-full">
        {pendente ? "Entrando…" : "Entrar"}
      </Button>
      <Link href="/recuperar-senha" className="text-center text-xs text-text-dim hover:text-text-muted">
        Esqueci minha senha
      </Link>
    </form>
  );
}
