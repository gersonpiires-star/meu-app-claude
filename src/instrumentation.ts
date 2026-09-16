import * as Sentry from "@sentry/nextjs";

// Sem DSN configurada (dev local, ou antes de você criar a conta no
// Sentry), não inicializa nada — mesmo espírito do enviarEmail sem
// RESEND_API_KEY: funciona normal, só sem mandar nada pra fora. Cai pra
// NEXT_PUBLIC_SENTRY_DSN (a mesma usada no navegador, ver
// instrumentation-client.ts) se SENTRY_DSN não estiver definida — DSN não é
// segredo, então na maioria dos casos um valor só já basta.
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
