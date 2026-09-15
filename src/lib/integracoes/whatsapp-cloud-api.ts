// Cliente da WhatsApp Cloud API oficial da Meta — cada revendedor conecta
// seu próprio número/app da Meta (mesmo padrão do Mercado Pago), então toda
// chamada recebe o phoneNumberId e o token de acesso daquele revendedor,
// nunca uma credencial global do GestorPro.

const GRAPH_VERSION = "v21.0";

export class ErroWhatsappCloudApi extends Error {}

async function erroDaResposta(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { error?: { message?: string } };
    return corpo.error?.message ?? `HTTP ${resposta.status}`;
  } catch {
    return `HTTP ${resposta.status}`;
  }
}

export async function enviarMensagemWhatsapp({
  phoneNumberId,
  token,
  para,
  texto,
}: {
  phoneNumberId: string;
  token: string;
  para: string;
  texto: string;
}): Promise<void> {
  const resposta = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: texto, preview_url: true },
    }),
  });
  if (!resposta.ok) {
    throw new ErroWhatsappCloudApi(`Falha ao enviar mensagem pelo WhatsApp: ${await erroDaResposta(resposta)}`);
  }
}

// Confirma phoneNumberId + token sem gastar o envio de uma mensagem de
// verdade — só lê os dados públicos do próprio número.
export async function testarCredenciaisWhatsapp({
  phoneNumberId,
  token,
}: {
  phoneNumberId: string;
  token: string;
}): Promise<{ numeroExibido: string }> {
  const resposta = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=display_phone_number`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resposta.ok) {
    throw new ErroWhatsappCloudApi(`Credenciais inválidas: ${await erroDaResposta(resposta)}`);
  }
  const dados = (await resposta.json()) as { display_phone_number?: string };
  return { numeroExibido: dados.display_phone_number ?? "" };
}
