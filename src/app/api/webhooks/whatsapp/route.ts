import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarWhatsappBr } from "@/lib/mensagens";
import { assinaturaValida } from "@/lib/twilio";
import { responderMensagemAssessor, AssessorNaoConfiguradoError } from "@/lib/assessor";

function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function respostaTwiml(mensagem?: string) {
  const corpo = mensagem ? `<Message>${escaparXml(mensagem)}</Message>` : "";
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response>${corpo}</Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

// Webhook de mensagem recebida da Twilio (WhatsApp). Configurar em
// console.twilio.com no número de WhatsApp: "WHEN A MESSAGE COMES IN" ->
// `${APP_URL}/api/webhooks/whatsapp`, método POST.
//
// Twilio espera resposta em poucos segundos — como cada mensagem pode
// rodar várias idas e vindas com o Claude (tool use) mais consultas ao
// banco, uma conversa incomum e longa pode estourar esse tempo. Nesse
// caso a Twilio reenvia a mesma mensagem; como cada envio grava no
// histórico da conversa, uma reentrega tardia pode gerar uma resposta
// duplicada — aceitável pra um MVP, mas vale monitorar em produção.
export async function POST(request: Request) {
  const corpoTexto = await request.text();
  const params = Object.fromEntries(new URLSearchParams(corpoTexto));

  const assinatura = request.headers.get("X-Twilio-Signature");
  if (!assinaturaValida(request.url, params, assinatura)) {
    console.error("Webhook WhatsApp: assinatura da Twilio inválida");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const de = params.From; // "whatsapp:+5511999999999"
  const corpoMensagem = params.Body?.trim();
  if (!de || !corpoMensagem) return respostaTwiml();

  const remetente = normalizarWhatsappBr(de.replace("whatsapp:", ""));

  // Só revendedores com o assessor ligado entram na comparação — evita
  // varrer a tabela inteira a cada mensagem recebida por um número
  // desconhecido.
  const candidatos = await prisma.revendedor.findMany({
    where: { assessorAtivo: true },
    select: { id: true, nome: true, whatsapp: true },
  });
  const revendedor = candidatos.find((r) => normalizarWhatsappBr(r.whatsapp) === remetente);

  if (!revendedor) {
    // Número não reconhecido (ou revendedor com o assessor desligado) —
    // não responde nada, pra não virar um oráculo aberto pra qualquer
    // número que descobrir o número da Twilio.
    return respostaTwiml();
  }

  try {
    const resposta = await responderMensagemAssessor(revendedor.id, revendedor.nome, corpoMensagem);
    return respostaTwiml(resposta);
  } catch (erro) {
    if (erro instanceof AssessorNaoConfiguradoError) {
      console.error("Webhook WhatsApp: assessor não configurado", erro);
      return respostaTwiml("O assessor de IA ainda não foi configurado pelo GestorPro. Avise o suporte.");
    }
    console.error("Webhook WhatsApp: falha ao responder mensagem", erro);
    return respostaTwiml("Tive um problema técnico agora. Tenta de novo em instantes.");
  }
}
