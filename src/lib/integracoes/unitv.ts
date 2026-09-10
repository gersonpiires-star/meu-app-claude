// Integração BETA com o painel da UniTV (https://panel-web.resell.media).
//
// NÃO VERIFICADO CONTRA O PAINEL DE VERDADE. A UniTV não publica nenhuma
// API documentada (pesquisado em 2026-09) — o endpoint/payload abaixo é uma
// tentativa razoável baseada no padrão comum de painéis IPTV white-label
// parecidos (SPA em hash-route + backend REST próprio), mas este ambiente
// de desenvolvimento não conseguiu nem alcançar panel-web.resell.media
// (bloqueado pelo proxy de rede do sandbox), então nada aqui foi testado
// contra o servidor real. A Vercel (produção) não tem esse bloqueio, então
// o primeiro teste de verdade acontece só depois do deploy — espere esse
// login falhar até corrigirmos com os dados reais da requisição.
//
// Pra corrigir de verdade: abra o painel da UniTV no navegador, abra o
// DevTools (F12) > aba Network, filtre por Fetch/XHR, faça login, ache a
// requisição de login na lista, botão direito > Copy > Copy as cURL, e
// manda esse cURL. O mesmo pra uma ação de renovação de cliente.

const BASE_URL = "https://panel-web.resell.media";

export type SessaoUnitv = { token: string };

export class ErroUnitv extends Error {}

export async function loginUnitv(usuario: string, senha: string): Promise<SessaoUnitv> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usuario, password: senha }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (erro) {
    throw new ErroUnitv(`Não foi possível conectar na UniTV: ${erro instanceof Error ? erro.message : "erro de rede"}`);
  }

  if (!resposta.ok) {
    throw new ErroUnitv(`A UniTV recusou o login (HTTP ${resposta.status}) — usuário/senha errados ou o endpoint mudou.`);
  }

  const dados: unknown = await resposta.json().catch(() => null);
  const token =
    dados && typeof dados === "object"
      ? ((dados as Record<string, unknown>).token ??
        (dados as { data?: Record<string, unknown> }).data?.token)
      : undefined;

  if (typeof token !== "string" || !token) {
    throw new ErroUnitv("A UniTV respondeu, mas sem o formato de token esperado — endpoint precisa ser corrigido.");
  }

  return { token };
}

// Ainda não implementado — depende de sabermos o formato real da requisição
// de renovação (endpoint, se é por ID do cliente ou por login dele, qual
// plano/período). Fica aqui só como o próximo passo assim que tivermos
// esses dados.
export async function renovarClienteUnitv(): Promise<never> {
  throw new ErroUnitv("Renovação automática ainda não implementada — falta o formato real da requisição da UniTV.");
}
