import Link from "next/link";
import { Card } from "@/components/ui";
import { LogoMark } from "@/components/logo-mark";
import { SignupForm } from "./signup-form";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  // Sem checar sessão aqui de propósito: quem abre um link de indicação
  // (/cadastro?ref=...) pode já estar logado numa outra conta (inclusive
  // o próprio revendedor testando o link dele) — precisa ver o formulário
  // mesmo assim. Criar a conta já loga como o usuário novo por conta
  // própria (ver signup-form.tsx), então não precisa bloquear o acesso aqui.
  const { ref } = await searchParams;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-deep">
            <LogoMark className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-text">GestorPro</h1>
          <p className="mt-1 text-xs text-text-dim">
            7 dias grátis para testar. Sem cartão, sem compromisso.
          </p>
        </div>

        <Card>
          <div className="mb-5 flex rounded-xl border border-border-strong p-1 text-sm font-semibold">
            <Link
              href="/entrar"
              className="flex-1 rounded-lg py-2 text-center text-text-dim hover:text-text"
            >
              Entrar
            </Link>
            <span className="flex-1 rounded-lg bg-accent-soft py-2 text-center text-accent">
              Criar conta
            </span>
          </div>

          <SignupForm indicadoPorId={ref} />
        </Card>
      </div>
    </main>
  );
}
