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

// SID do Content Template aprovado pela Meta para lembrete de vencimento
// (ver README, seção "Assessor de IA no WhatsApp" → lembretes em lote) —
// sem isso, o envio proativo (fora da janela de 24h) não funciona; o
// assessor avisa o revendedor em vez de tentar mandar mensagem livre.
export function templateLembreteConfigurado(): boolean {
  return Boolean(process.env.TWILIO_CONTENT_SID_LEMBRETE);
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

async function postParaTwilio(form: URLSearchParams): Promise<{ ok: true } | { ok: false; erro: string }> {
  const creds = credenciais();
  if (!creds) return { ok: false, erro: "Twilio não configurado" };

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

function destinoWhatsapp(para: string): string {
  return para.startsWith("whatsapp:") ? para : `whatsapp:+${normalizarWhatsappBr(para)}`;
}

// Manda uma mensagem de WhatsApp LIVRE através da Twilio. Fora da janela
// de 24h desde a última mensagem recebida do destinatário, a Twilio só
// aceita templates pré-aprovados — uma mensagem livre nesse caso é
// recusada, e o chamador decide o que fazer (ex: avisar que precisa
// mandar na mão dessa vez, ou usar enviarWhatsAppTemplate).
export async function enviarWhatsApp(para: string, corpo: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const creds = credenciais();
  if (!creds) return { ok: false, erro: "Twilio não configurado" };
  return postParaTwilio(new URLSearchParams({ From: creds.numero, To: destinoWhatsapp(para), Body: corpo }));
}

// Manda mensagem usando um Content Template aprovado pela Meta — funciona
// a qualquer momento, mesmo fora da janela de 24h (é assim que dá pra
// mandar lembrete de vencimento de forma proativa, sem esperar o cliente
// escrever primeiro). `contentSid` é o "HXxxxxxxxx..." do template
// cadastrado no Content Template Builder da Twilio; `variaveis` preenche
// os placeholders numerados do template ("1", "2", ... na ordem em que
// aparecem no texto aprovado).
export async function enviarWhatsAppTemplate(
  para: string,
  contentSid: string,
  variaveis: Record<string, string>
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const creds = credenciais();
  if (!creds) return { ok: false, erro: "Twilio não configurado" };
  return postParaTwilio(
    new URLSearchParams({
      From: creds.numero,
      To: destinoWhatsapp(para),
      ContentSid: contentSid,
      ContentVariables: JSON.stringify(variaveis),
    })
  );
}
