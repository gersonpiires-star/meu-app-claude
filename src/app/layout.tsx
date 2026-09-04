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

export const metadata: Metadata = {
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
    >
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
