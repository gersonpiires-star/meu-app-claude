import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui";
import { SignupForm } from "./signup-form";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { ref } = await searchParams;

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
