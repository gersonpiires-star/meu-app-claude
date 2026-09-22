import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarWhatsappBr } from "@/lib/mensagens";
import { segredoWebhookValido } from "@/lib/zapi";
import { enviarLivre } from "@/lib/whatsapp";
import { responderMensagemAssessor, AssessorNaoConfiguradoError } from "@/lib/assessor";

type PayloadZApi = {
  phone?: string;
  fromMe?: boolean;
  isGroup?: boolean;
  text?: { message?: string };
};

// Webhook de mensagem recebida da Z-API. Configurar no painel da Z-API,
// na instância, em "Ao receber" -> `${APP_URL}/api/webhooks/whatsapp-zapi?secret=${ZAPI_WEBHOOK_SECRET}`.
//
// Diferente da Twilio (que aceita a resposta como o próprio corpo XML do
// webhook), a Z-API só entrega a notificação — responder ao revendedor
// exige chamar a API de envio de volta, por isso o await enviarLivre()
// abaixo em vez de só devolver algo no corpo da resposta HTTP.
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!segredoWebhookValido(url.searchParams.get("secret"))) {
    console.error("Webhook Z-API: segredo inválido ou ausente na URL");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const corpo = (await request.json().catch(() => null)) as PayloadZApi | null;
  if (!corpo) return NextResponse.json({ ok: true });

  // Mensagem mandada por mim mesmo (outro dispositivo logado no mesmo
  // WhatsApp) ou de um grupo não interessam — o assessor é 1:1 com o
  // dono da conta.
  if (corpo.fromMe || corpo.isGroup) return NextResponse.json({ ok: true });

  const remetenteBruto = corpo.phone;
  if (!remetenteBruto) return NextResponse.json({ ok: true });

  const remetente = normalizarWhatsappBr(remetenteBruto);

  const candidatos = await prisma.revendedor.findMany({
    where: { assessorAtivo: true },
    select: { id: true, nome: true, whatsapp: true },
  });
  const revendedor = candidatos.find((r) => normalizarWhatsappBr(r.whatsapp) === remetente);

  if (!revendedor) {
    // Número não reconhecido (ou assessor desligado) — ignora, pra não
    // virar um oráculo aberto pra qualquer número que descobrir a URL.
    return NextResponse.json({ ok: true });
  }

  // Áudio, figurinha, foto etc.: o assessor ainda só entende texto. Sem
  // isso, mandar áudio (sem campo "text") caía no "sem mensagem"
  // silencioso e o revendedor achava que o assessor não respondeu.
  const textoMensagem = corpo.text?.message?.trim();
  if (!textoMensagem) {
    await enviarLivre(remetenteBruto, "Por enquanto só consigo ler texto por aqui — pode escrever o que você precisa?").catch(() => {});
    return NextResponse.json({ ok: true });
  }

  try {
    const resposta = await responderMensagemAssessor(revendedor.id, revendedor.nome, textoMensagem);
    await enviarLivre(remetenteBruto, resposta);
  } catch (erro) {
    const mensagemErro =
      erro instanceof AssessorNaoConfiguradoError
        ? "O assessor de IA ainda não foi configurado pelo GestorPro. Avise o suporte."
        : "Tive um problema técnico agora. Tenta de novo em instantes.";
    if (!(erro instanceof AssessorNaoConfiguradoError)) console.error("Webhook Z-API: falha ao responder mensagem", erro);
    await enviarLivre(remetenteBruto, mensagemErro).catch((erroEnvio) => {
      console.error("Webhook Z-API: falha ao enviar mensagem de erro de volta", erroEnvio);
    });
  }

  return NextResponse.json({ ok: true });
}
