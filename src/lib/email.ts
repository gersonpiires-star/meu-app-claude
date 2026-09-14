import { Resend } from "resend";

let resendClient: Resend | null = null;

function cliente(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada — configure a variável de ambiente antes de enviar e-mails.");
  }
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// Sem RESEND_API_KEY (ex: dev local sem a key configurada), não trava o
// fluxo — só avisa no terminal com o link/conteúdo, pra dar pra testar a
// tela inteira sem depender da key. Em produção a key é obrigatória.
export async function enviarEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY não configurada — e-mail não enviado.\nPara: ${to}\nAssunto: ${subject}\n${html}`);
    return;
  }
  const from = process.env.EMAIL_FROM ?? "GestorPro <naoresponda@meugestorpro.app.br>";
  const { error } = await cliente().emails.send({ from, to, subject, html });
  if (error) throw new Error(`Falha ao enviar e-mail via Resend: ${error.message}`);
}
