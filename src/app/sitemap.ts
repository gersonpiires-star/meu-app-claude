import type { MetadataRoute } from "next";

const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Só as páginas públicas de marketing/autenticação — tudo que exige sessão
// ((app), admin, assinatura) ou é transacional com token na URL
// (pagamento, pagar/[clienteId], redefinir-senha) não tem por que ser
// indexado nem faz sentido num sitemap (robots.ts já bloqueia o resto).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/entrar`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/cadastro`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/recuperar-senha`, changeFrequency: "yearly", priority: 0.1 },
  ];
}
