import crypto from "node:crypto";
import { normalizarWhatsappBr } from "@/lib/mensagens";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

function credenciais() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const numero = process.env.TWILIO_WHATSAPP_NUMBER; // formato "whatsapp:+14155238886"
  if (!sid || !token || !numero) return null;
  return { sid, token, numero };
}

export function assessorConfigurado(): boolean {
  return credenciais() !== null && Boolean(process.env.ANTHROPIC_API_KEY);
}

// Confere a assinatura X-Twilio-Signature do webhook — sem isso, qualquer
// um que descobrisse a URL do webhook podia forjar um "From" de outro
// revendedor e mexer nos dados de quem quisesse. Algoritmo oficial da
// Twilio: HMAC-SHA1(authToken, url + parâmetros ordenados por chave e
// concatenados "chave+valor" sem separador), depois base64.
export function assinaturaValida(url: string, params: Record<string, string>, assinaturaRecebida: string | null): boolean {
  const creds = credenciais();
  if (!creds || !assinaturaRecebida) return false;

  let base = url;
  for (const chave of Object.keys(params).sort()) base += chave + params[chave];

  const esperada = crypto.createHmac("sha1", creds.token).update(base, "utf8").digest("base64");

  const bufEsperada = Buffer.from(esperada);
  const bufRecebida = Buffer.from(assinaturaRecebida);
  if (bufEsperada.length !== bufRecebida.length) return false;
  return crypto.timingSafeEqual(bufEsperada, bufRecebida);
}

// Manda uma mensagem de WhatsApp através da Twilio. Fora da janela de 24h
// desde a última mensagem recebida do destinatário, a Twilio só aceita
// templates pré-aprovados — uma mensagem livre nesse caso é recusada, e o
// chamador decide o que fazer (ex: avisar que precisa mandar na mão dessa
// vez).
export async function enviarWhatsApp(para: string, corpo: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const creds = credenciais();
  if (!creds) return { ok: false, erro: "Twilio não configurado" };

  const destino = para.startsWith("whatsapp:") ? para : `whatsapp:+${normalizarWhatsappBr(para)}`;

  const form = new URLSearchParams({ From: creds.numero, To: destino, Body: corpo });

  const resposta = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.sid}:${creds.token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("Twilio: falha ao enviar mensagem", resposta.status, detalhe);
    return { ok: false, erro: `Twilio respondeu ${resposta.status}` };
  }
  return { ok: true };
}
