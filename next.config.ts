import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// CSP só em produção — em dev o HMR do Turbopack precisa de WebSocket/eval
// que essa política bloquearia, e não tem motivo pra travar isso localmente.
// Nenhuma integração do app carrega script/iframe de terceiro no navegador
// (Mercado Pago e Asaas são chamados só do servidor, via API) — por isso dá
// pra manter o CSP restrito sem abrir exceção pra domínio de pagamento.
const CSP_PRODUCAO = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.sentry.io https://*.ingest.us.sentry.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(process.env.NODE_ENV === "production"
        ? [
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
            { key: "Content-Security-Policy", value: CSP_PRODUCAO },
          ]
        : []),
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sem SENTRY_AUTH_TOKEN (dev local ou antes de configurar), o plugin só
// pula o upload de source maps — build continua funcionando normal.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
});
