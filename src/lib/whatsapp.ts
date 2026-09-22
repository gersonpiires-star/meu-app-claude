import * as twilio from "@/lib/twilio";
import * as zapi from "@/lib/zapi";

// Ponto único que o resto do app usa pra falar de WhatsApp — decide entre
// Twilio (API oficial) e Z-API (não oficial) por variável de ambiente,
// sem o resto do código (ferramentas do assessor, tela de Configurações)
// precisar saber qual dos dois está ligado. Ver README, seção "Assessor
// de IA no WhatsApp", pra escolher entre os dois.
export type ResultadoEnvio = { ok: true } | { ok: false; erro: string };

export function provedorAtivo(): "twilio" | "zapi" {
  return process.env.WHATSAPP_PROVIDER === "zapi" ? "zapi" : "twilio";
}

export function canalConfigurado(): boolean {
  return provedorAtivo() === "zapi" ? zapi.zapiConfigurado() : twilio.twilioConfigurado();
}

export function assessorConfigurado(): boolean {
  return canalConfigurado() && Boolean(process.env.ANTHROPIC_API_KEY);
}

// Envio proativo (fora de qualquer janela de resposta) pra vários
// clientes de uma vez. Na Z-API sempre funciona se o canal estiver
// configurado (ela não segue a regra de janela de 24h da API oficial).
// Na Twilio, só funciona com um Content Template aprovado pela Meta.
export function envioProativoDisponivel(): boolean {
  return provedorAtivo() === "zapi" ? zapi.zapiConfigurado() : twilio.templateLembreteConfigurado();
}

// Mensagem livre — na Twilio só é aceita se o destinatário tiver escrito
// pro número nas últimas 24h; na Z-API funciona a qualquer momento.
export async function enviarLivre(para: string, corpo: string): Promise<ResultadoEnvio> {
  return provedorAtivo() === "zapi" ? zapi.enviarWhatsApp(para, corpo) : twilio.enviarWhatsApp(para, corpo);
}

// Envio proativo via Content Template — só existe na Twilio (é o
// mecanismo oficial da Meta pra mandar mensagem fora da janela de 24h).
// Chamar isso com Z-API ativo é erro de programação, não caminho
// esperado: quem chama deve checar provedorAtivo()/envioProativoDisponivel()
// antes e usar enviarLivre no caminho da Z-API.
export async function enviarProativoTemplate(para: string, contentSid: string, variaveis: Record<string, string>): Promise<ResultadoEnvio> {
  if (provedorAtivo() !== "twilio") return { ok: false, erro: "enviarProativoTemplate só existe com WHATSAPP_PROVIDER=twilio" };
  return twilio.enviarWhatsAppTemplate(para, contentSid, variaveis);
}
