import Link from "next/link";
import { Card } from "@/components/ui";
import { LogoMark } from "@/components/logo-mark";
import { RedefinirForm } from "./redefinir-form";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-deep">
            <LogoMark className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-text">Nova senha</h1>
          <p className="mt-1 text-xs text-text-dim">Escolha uma nova senha pra sua conta.</p>
        </div>

        <Card>
          {token ? (
            <RedefinirForm token={token} />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-danger">Link inválido — faltou o token de recuperação.</p>
              <Link href="/recuperar-senha" className="text-xs font-semibold text-accent hover:underline">
                Pedir um novo link
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
