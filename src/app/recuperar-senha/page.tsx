import Link from "next/link";
import { Card } from "@/components/ui";
import { LogoMark } from "@/components/logo-mark";
import { RecuperarForm } from "./recuperar-form";

export default function RecuperarSenhaPage() {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-deep">
            <LogoMark className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-text">Recuperar senha</h1>
          <p className="mt-1 text-xs text-text-dim">Informe o e-mail da sua conta pra receber o link de redefinição.</p>
        </div>

        <Card>
          <RecuperarForm />
          <Link href="/entrar" className="mt-4 block text-center text-xs text-text-dim hover:text-text">
            ‹ Voltar pro login
          </Link>
        </Card>
      </div>
    </main>
  );
}
