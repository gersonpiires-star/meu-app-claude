import * as Sentry from "@sentry/nextjs";

// DSN do Sentry não é segredo (é feita pra ir no bundle do navegador), mas
// só inicializa se estiver configurada — sem isso, roda normal e sem
// mandar nada, igual o lado do servidor em src/instrumentation.ts.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
