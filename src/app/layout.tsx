import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Sem isso, a tag og:image (gerada por opengraph-image.tsx) saía com uma
// URL relativa — e o crawler do WhatsApp/Facebook/Telegram não resolve URL
// relativa, por isso o preview ao compartilhar o link não mostrava nenhuma
// imagem (ou caía num ícone genérico do próprio app de mensagens).
const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "GestorPro",
  description: "Gestão de clientes, vendas e estoque para revenda de streaming",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GestorPro",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "GestorPro",
    description: "Gestão de clientes, vendas e estoque para revenda de streaming",
    url: baseUrl,
    siteName: "GestorPro",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GestorPro",
    description: "Gestão de clientes, vendas e estoque para revenda de streaming",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a2530",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
      // O script de tema logo abaixo marca data-theme no <html> antes da
      // hidratação (pra evitar flash de tema errado) — isso sempre diverge
      // do HTML renderizado no servidor, que não tem como saber o tema
      // salvo no localStorage do navegador. React trata essa divergência
      // específica (atributo do próprio <html>, não dos filhos) como só um
      // warning — suppressHydrationWarning aqui silencia só esse aviso
      // esperado, sem esconder mismatch de verdade em nenhum outro elemento.
      suppressHydrationWarning
    >
      <head>
        {/* Resolve o tema (claro/escuro/automático) e marca data-theme antes
            da primeira pintura — sem isso a página nasce no tema escuro
            padrão do CSS e só troca pro claro depois que o React hidrata,
            gerando um flash visível pra quem escolheu claro. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem("gestorpro-theme-mode")||"dark";var r=m==="auto"?(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):m;document.documentElement.setAttribute("data-theme",r);}catch(e){}})();`,
          }}
        />
      </head>
      {/* 100dvh (não h-full/min-h-full em cascata) porque no Chrome mobile a
      barra de endereço que aparece/some faz o navegador reportar uma altura
      de "layout viewport" maior que a área realmente visível — com % em
      cascata (html 100% → body 100% → ...) o body às vezes ficava do
      tamanho do conteúdo em vez de esticar, sobrando um vão enorme antes do
      rodapé fixo. dvh mede a altura visível de verdade, sem depender da
      cascata de porcentagens. */}
      <body className="min-h-dvh flex flex-col bg-bg text-text">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
