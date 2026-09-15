import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import { enviarMensagemWhatsapp } from "@/lib/integracoes/whatsapp-cloud-api";
import { responderMensagemWhatsapp } from "@/lib/integracoes/whatsapp-bot";

// Handshake de verificação do webhook — a Meta chama isso uma vez quando o
// revendedor cadastra essa URL no app dele. Um único token compartilhado
// (não por revendedor: todos os apps apontam pra essa mesma URL) confirma
// que quem está configurando o webhook é de fato dono de um app da Meta que
// a gente reconhece — não protege nada além disso, e não precisa proteger
// mais: quem já criou um app na Meta já passou pela verificação deles.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (modo === "subscribe" && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Token de verificação inválido", { status: 403 });
}

type MensagemRecebida = {
  from: string;
  type: string;
  text?: { body?: string };
};

type MudancaWebhook = {
  value?: {
    metadata?: { phone_number_id?: string };
    messages?: MensagemRecebida[];
  };
};

export async function POST(request: Request) {
  const corpo = (await request.json()) as { entry?: { changes?: MudancaWebhook[] }[] };

  for (const entrada of corpo.entry ?? []) {
    for (const mudanca of entrada.changes ?? []) {
      const phoneNumberId = mudanca.value?.metadata?.phone_number_id;
      const mensagens = mudanca.value?.messages ?? [];
      if (!phoneNumberId || mensagens.length === 0) continue;

      const revendedor = await prisma.revendedor.findUnique({
        where: { whatsappTelefoneNumeroId: phoneNumberId },
        select: { id: true, whatsappBotAtivo: true, whatsappTokenCriptografado: true },
      });
      if (!revendedor || !revendedor.whatsappBotAtivo || !revendedor.whatsappTokenCriptografado) continue;

      const tokenAcesso = descriptografar(revendedor.whatsappTokenCriptografado);

      for (const mensagem of mensagens) {
        // Só responde texto — ignora status de entrega, figurinha, áudio
        // etc., que o bot não sabe (nem faz sentido tentar) interpretar.
        if (mensagem.type !== "text") continue;
        const de = mensagem.from;
        const texto = mensagem.text?.body ?? "";

        try {
          const resposta = await responderMensagemWhatsapp(revendedor.id, de, texto);
          await enviarMensagemWhatsapp({ phoneNumberId, token: tokenAcesso, para: de, texto: resposta });
        } catch (erro) {
          console.error("Falha ao responder mensagem do WhatsApp", erro);
        }
      }
    }
  }

  // A Meta desativa o webhook depois de falhas repetidas em obter 200 — por
  // isso sempre responde OK aqui (o erro específico de uma mensagem já foi
  // logado acima), nunca deixando o processamento interno virar retry da Meta.
  return new NextResponse("OK", { status: 200 });
}
