"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Pega erro de renderização que escapa até da árvore inteira do app
// (nem o layout normal continua de pé) — só chega aqui em falha grave.
// Reporta pro Sentry (se configurado; sem DSN não faz nada) e mostra uma
// tela simples, sem depender de nada do resto do app que pode estar quebrado.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0a2530", color: "#eaf3f5", fontFamily: "sans-serif" }}>
        <main style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>Algo deu errado</h1>
            <p style={{ fontSize: 14, color: "#9fc1c9", margin: "0 0 16px" }}>
              Encontramos um erro inesperado. Tente atualizar a página — se continuar, avise o suporte.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#2ee6c5",
                color: "#04211c",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Atualizar página
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
