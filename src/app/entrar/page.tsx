import Link from "next/link";
import { redirect } from "next/navigation";
import { sessaoValida } from "@/lib/sessao";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export default async function EntrarPage() {
  const session = await sessaoValida();
  if (session) redirect("/");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-accent" />
          <h1 className="text-xl font-bold text-text">GestorPro</h1>
          <p className="mt-1 text-xs text-text-dim">
            7 dias grátis para testar. Sem cartão, sem compromisso.
          </p>
        </div>

        <Card>
          <div className="mb-5 flex rounded-xl border border-border-strong p-1 text-sm font-semibold">
            <span className="flex-1 rounded-lg bg-accent-soft py-2 text-center text-accent">
              Entrar
            </span>
            <Link
              href="/cadastro"
              className="flex-1 rounded-lg py-2 text-center text-text-dim hover:text-text"
            >
              Criar conta
            </Link>
          </div>

          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
