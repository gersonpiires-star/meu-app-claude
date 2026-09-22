import crypto from "node:crypto";
import { normalizarWhatsappBr } from "@/lib/mensagens";

// Z-API (z-api.io) é um provedor brasileiro não oficial: conecta ao
// WhatsApp escaneando um QR code no seu próprio número, como o WhatsApp
// Web — não passa pela API oficial da Meta. Por isso é mais barato e não
// precisa de aprovação de template (ver enviarLembreteVencimento em
// tools.ts), mas roda por fora dos termos de uso do WhatsApp: risco real
// do número ser banido. Ver README, seção "Assessor de IA no WhatsApp".
function credenciais() {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!instanceId || !token) return null;
  return { instanceId, token, clientToken: process.env.ZAPI_CLIENT_TOKEN };
}

export function zapiConfigurado(): boolean {
  return credenciais() !== null;
}

// A Z-API não assina o corpo do webhook (sem equivalente ao
// X-Twilio-Signature da Twilio) — a forma recomendada por ela mesma de
// proteger o endpoint é manter a URL secreta. Aqui isso é reforçado
// exigindo um token na própria URL (?secret=...), comparado em tempo
// constante; sem ZAPI_WEBHOOK_SECRET configurado, o webhook rejeita tudo
// por padrão (fail-closed) em vez de aceitar qualquer requisição.
export function segredoWebhookValido(recebido: string | null): boolean {
  const esperado = process.env.ZAPI_WEBHOOK_SECRET;
  if (!esperado || !recebido) return false;
  const bufEsperado = Buffer.from(esperado);
  const bufRecebido = Buffer.from(recebido);
  if (bufEsperado.length !== bufRecebido.length) return false;
  return crypto.timingSafeEqual(bufEsperado, bufRecebido);
}

export async function enviarWhatsApp(para: string, corpo: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const creds = credenciais();
  if (!creds) return { ok: false, erro: "Z-API não configurado" };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (creds.clientToken) headers["Client-Token"] = creds.clientToken;

  const resposta = await fetch(`https://api.z-api.io/instances/${creds.instanceId}/token/${creds.token}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: normalizarWhatsappBr(para), message: corpo }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("Z-API: falha ao enviar mensagem", resposta.status, detalhe);
    return { ok: false, erro: `Z-API respondeu ${resposta.status}` };
  }
  return { ok: true };
}
