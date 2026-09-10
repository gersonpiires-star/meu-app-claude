// Integração BETA com o painel da UniTV (https://panel-web.resell.media).
//
// NÃO VERIFICADO CONTRA O PAINEL DE VERDADE. A UniTV não publica nenhuma
// API documentada (pesquisado em 2026-09), e não foi possível capturar a
// requisição real do navegador (o painel resiste à interceptação HTTPS por
// apps de sniffing no celular). Sem o endereço certo, `loginUnitv` tenta uma
// lista de caminhos comuns pra esse tipo de painel (white-label IPTV,
// provavelmente de origem chinesa — RuoYi/vue-element-admin/jeecg-boot são
// frameworks de admin muito usados nesse nicho) até um responder algo
// diferente de 404. Se nenhum funcionar, o erro mostra o resultado de cada
// tentativa pra decidirmos o próximo passo com dado real.
//
// Esse ambiente de desenvolvimento não consegue nem alcançar
// panel-web.resell.media (bloqueado pelo proxy de rede do sandbox) — só a
// Vercel (produção) consegue testar de verdade.

const BASE_URL = "https://panel-web.resell.media";

// 1ª rodada (já descartada): caminhos sem "/api" batem direto no 404 padrão
// do Nginx/openresty — nem chegam a existir nessa camada. Só "/api/..."
// chega no backend de verdade, que responde "404 page not found" em texto
// puro (assinatura típica de Go/Gin) quando a rota não existe. Essa 2ª
// rodada foca só em variações de /api/ prováveis pra painel de
// revendedor/agente ("agent" é o termo comum em inglês pra esse tipo de
// painel IPTV chinês de revenda).
const CAMINHOS_CANDIDATOS = [
  "/api/admin/login",
  "/api/agent/login",
  "/api/reseller/login",
  "/api/account/login",
  "/api/v2/login",
  "/api/v2/user/login",
  "/api/v2/auth/login",
  "/api/signin",
  "/api/auth/signin",
  "/api/member/login",
  "/api/customer/login",
  "/api/reseller/user/login",
];

export type SessaoUnitv = { token: string };

export class ErroUnitv extends Error {}

async function tentarCaminho(caminho: string, usuario: string, senha: string) {
  try {
    const resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usuario, password: senha }),
      signal: AbortSignal.timeout(8000),
    });
    const texto = await resposta.text().catch(() => "");
    return { caminho, status: resposta.status, corpo: texto.slice(0, 200), ok: resposta.ok, erro: null as string | null };
  } catch (erro) {
    return { caminho, status: null, corpo: "", ok: false, erro: erro instanceof Error ? erro.message : "erro de rede" };
  }
}

export async function loginUnitv(usuario: string, senha: string): Promise<SessaoUnitv> {
  const resultados: Awaited<ReturnType<typeof tentarCaminho>>[] = [];

  for (const caminho of CAMINHOS_CANDIDATOS) {
    const resultado = await tentarCaminho(caminho, usuario, senha);
    resultados.push(resultado);

    // 404 = caminho errado, direto pro próximo. Qualquer outra coisa (200,
    // 401, 400, 422...) já é sinal de que achamos o endpoint de verdade —
    // para aqui pra não continuar batendo em outros caminhos à toa.
    if (resultado.status !== 404 && resultado.status !== null) break;
  }

  const ultimo = resultados[resultados.length - 1];

  if (ultimo.ok) {
    const dados: unknown = JSON.parse(ultimo.corpo || "{}");
    const token =
      dados && typeof dados === "object"
        ? ((dados as Record<string, unknown>).token ?? (dados as { data?: Record<string, unknown> }).data?.token)
        : undefined;
    if (typeof token === "string" && token) return { token };
  }

  const relatorio = resultados
    .map((r) => (r.erro ? `${r.caminho} → erro: ${r.erro}` : `${r.caminho} → HTTP ${r.status}${r.corpo ? `: ${r.corpo}` : ""}`))
    .join("\n");

  throw new ErroUnitv(`Nenhum endpoint conhecido funcionou:\n${relatorio}`);
}

// Ainda não implementado — depende de sabermos o formato real da requisição
// de renovação (endpoint, se é por ID do cliente ou por login dele, qual
// plano/período). Fica aqui só como o próximo passo assim que tivermos
// esses dados.
export async function renovarClienteUnitv(): Promise<never> {
  throw new ErroUnitv("Renovação automática ainda não implementada — falta o formato real da requisição da UniTV.");
}
