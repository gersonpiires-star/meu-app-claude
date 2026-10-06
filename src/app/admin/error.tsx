"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Card, Button } from "@/components/ui";

// Mesmo boundary de (app)/error.tsx, pro lado do admin — o menu/nav do
// admin mora no layout, por fora disso, então continua de pé mesmo quando
// o conteúdo de uma tela (assinantes, cupons, comunicados...) quebra.
export default function ErroAdmin({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-base font-bold text-text">Essa tela deu um erro</h1>
        <p className="text-sm text-text-muted">Algo inesperado aconteceu aqui. Tente de novo.</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={reset}>Tentar de novo</Button>
          <Link href="/admin" className="inline-flex">
            <Button variant="ghost">Voltar ao admin</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
