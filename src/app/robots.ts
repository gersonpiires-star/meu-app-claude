import type { MetadataRoute } from "next";

const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/clientes",
        "/painel",
        "/plataformas",
        "/relatorio",
        "/vendas",
        "/estoque",
        "/precificacao",
        "/interessados",
        "/configuracoes",
        "/ajuda",
        "/assinatura",
        "/pagamento",
        "/pagar",
        "/redefinir-senha",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
