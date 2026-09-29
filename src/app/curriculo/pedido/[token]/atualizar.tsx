"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Reconsulta o servidor a cada poucos segundos enquanto o pagamento está
// pendente, para o botão de download aparecer sem o comprador recarregar.
export function AtualizarAutomaticamente() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [router]);
  return <p className="mt-4 text-xs text-slate-500">Atualizando automaticamente...</p>;
}
