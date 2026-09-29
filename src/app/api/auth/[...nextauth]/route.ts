import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

// O Auth.js sempre grava o cookie de sessão com um "Expires" fixo (30 dias
// por padrão, vem de session.maxAge em lib/auth.ts) — em TODO Set-Cookie,
// inclusive nos refresh automáticos que o SessionProvider dispara a cada
// foco de janela (GET /api/auth/session). Isso não é configurável pelas
// opções do NextAuth: o valor é sempre recalculado e sobrescrito na hora de
// montar o cookie. Resultado: a sessão sobrevive fechando o navegador, o
// que o usuário não quer (pediu pra deslogar ao fechar a página).
//
// Removendo Expires/Max-Age da resposta, o cookie vira um cookie de sessão
// de verdade — o navegador descarta ele quando fecha. Preservamos de
// propósito qualquer cookie com Max-Age=0 (é o próprio Auth.js apagando o
// cookie no logout) pra não vir a reviver um cookie que devia sumir.
function semExpiracaoPersistente(resposta: Response): Response {
  const cookies = resposta.headers.getSetCookie();
  if (cookies.length === 0) return resposta;

  const novasHeaders = new Headers(resposta.headers);
  novasHeaders.delete("set-cookie");
  for (const cookie of cookies) {
    const ehLimpeza = /;\s*Max-Age=0(;|$)/i.test(cookie);
    novasHeaders.append(
      "set-cookie",
      ehLimpeza ? cookie : cookie.replace(/;\s*Expires=[^;]*/i, "").replace(/;\s*Max-Age=\d+/i, "")
    );
  }

  return new Response(resposta.body, { status: resposta.status, statusText: resposta.statusText, headers: novasHeaders });
}

export async function GET(request: NextRequest) {
  return semExpiracaoPersistente(await handlers.GET(request));
}

export async function POST(request: NextRequest) {
  return semExpiracaoPersistente(await handlers.POST(request));
}
