import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";

// O Auth.js sempre grava o cookie de sessão com um "Expires" fixo (30 dias
// por padrão, vem de session.maxAge em lib/auth.ts) — em TODO Set-Cookie,
// inclusive nos refresh automáticos que o SessionProvider dispara a cada
// foco de janela (GET /api/auth/session). Isso não é configurável pelas
// opções do NextAuth: o valor é sempre recalculado e sobrescrito na hora de
// montar o cookie. Resultado: a sessão sobrevive fechando o navegador, o
// que o usuário não quer por padrão (só quando marca "manter conectado").
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

// Marca a escolha de "manter conectado" feita no login, num cookie próprio
// (não some com a estratégia JWT, não carrega nada sensível) — sem isso, o
// refresh automático de sessão no foco da janela (GET abaixo) não teria
// como saber, numa chamada futura isolada, se aquela sessão foi marcada pra
// persistir ou não, e ia apagar o Expires de um login que pediu pra lembrar.
const COOKIE_LEMBRAR = "gestorpro-lembrar";
const UM_MES_SEGUNDOS = 30 * 24 * 60 * 60;

function ehHttps(request: NextRequest): boolean {
  return request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:";
}

function marcadorLembrar(lembrar: boolean, https: boolean): string {
  const atributos = `Path=/; HttpOnly; SameSite=Lax${https ? "; Secure" : ""}`;
  return lembrar ? `${COOKIE_LEMBRAR}=1; ${atributos}; Max-Age=${UM_MES_SEGUNDOS}` : `${COOKIE_LEMBRAR}=; ${atributos}; Max-Age=0`;
}

function estaMarcadoPraLembrar(request: NextRequest): boolean {
  return request.cookies.get(COOKIE_LEMBRAR)?.value === "1";
}

export async function GET(request: NextRequest) {
  const resposta = await handlers.GET(request);
  return estaMarcadoPraLembrar(request) ? resposta : semExpiracaoPersistente(resposta);
}

export async function POST(request: NextRequest) {
  const ehLogin = request.nextUrl.pathname.endsWith("/callback/credentials");

  // Só espia o corpo (via clone — o original segue intacto pro handlers.POST
  // ler normal) na rota de login, que é a única que manda esse campo.
  let lembrar = false;
  if (ehLogin) {
    try {
      lembrar = (await request.clone().formData()).get("lembrar") === "true";
    } catch {
      // corpo não era form-urlencoded — segue com lembrar=false
    }
  }

  const resposta = await handlers.POST(request);
  if (!ehLogin) {
    return estaMarcadoPraLembrar(request) ? resposta : semExpiracaoPersistente(resposta);
  }

  const comMarcador = new Headers(resposta.headers);
  comMarcador.append("set-cookie", marcadorLembrar(lembrar, ehHttps(request)));
  const respostaComMarcador = new Response(resposta.body, {
    status: resposta.status,
    statusText: resposta.statusText,
    headers: comMarcador,
  });

  return lembrar ? respostaComMarcador : semExpiracaoPersistente(respostaComMarcador);
}
