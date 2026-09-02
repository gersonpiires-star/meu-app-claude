import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { SairButton } from "@/components/sair-button";

export function AcessoPausado({ nome }: { nome: string }) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-warning-bg text-warning" />
        <h1 className="text-lg font-bold text-text">Acesso pausado</h1>
        <p className="mt-2 text-sm text-text-dim">
          Olá, {nome}. Seus dados continuam guardados e voltam assim que o acesso for liberado.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/assinatura">
            <Button className="w-full">Ver planos</Button>
          </Link>
          <SairButton className="text-xs font-semibold text-text-dim hover:text-danger" />
        </div>
      </Card>
    </main>
  );
}
