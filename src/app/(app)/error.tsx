"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Card, Button } from "@/components/ui";

// Erro de renderização dentro de uma tela do app (clientes, relatório,
// vendas etc.) — sem isso, qualquer erro aqui subia até global-error.tsx e
// derrubava a página inteira (até o menu lateral desaparecia). Com esse
// boundary no nível do segmento, só o conteúdo quebra: o NavShell (menu,
// nome, notificações) continua de pé porque mora no layout, por fora disso.
export default function ErroApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-base font-bold text-text">Essa tela deu um erro</h1>
        <p className="text-sm text-text-muted">
          Algo inesperado aconteceu aqui. Tente de novo — se continuar, avise o suporte.
        </p>
        <div className="mt-2 flex gap-2">
          <Button onClick={reset}>Tentar de novo</Button>
          <Link href="/painel" className="inline-flex">
            <Button variant="ghost">Voltar ao painel</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
