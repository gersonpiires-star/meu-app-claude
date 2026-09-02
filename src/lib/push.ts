import webpush from "web-push";

let configurado = false;

function configurar() {
  if (configurado) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:suporte@example.com", publicKey, privateKey);
  configurado = true;
}

// Retorna false quando a inscrição expirou/foi revogada (deve ser apagada do
// banco) e true nos demais casos (enviado com sucesso ou falha temporária).
export async function enviarPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { titulo: string; corpo: string; url?: string }
): Promise<boolean> {
  configurar();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    );
    return true;
  } catch (erro) {
    const statusCode = erro && typeof erro === "object" && "statusCode" in erro ? (erro as { statusCode: number }).statusCode : 0;
    if (statusCode === 404 || statusCode === 410) return false;
    console.error("Falha ao enviar notificação push", erro);
    return true;
  }
}
