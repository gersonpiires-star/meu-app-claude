// Templates de e-mail transacional do GestorPro — HTML com estilo inline
// (não dá pra confiar em <style> no <head> nem em classes CSS externas,
// vários webmails ignoram ou removem) e layout simples em tabela, que é o
// que renderiza de forma previsível no maior número de clientes de e-mail.

const COR_FUNDO = "#0a2530";
const COR_CARTAO = "#0f2f3c";
const COR_BORDA = "#1d4959";
const COR_TEXTO = "#eaf3f5";
const COR_TEXTO_DIM = "#9fc1c9";
const COR_ACCENT = "#2ee6c5";

function layoutEmail({ titulo, corpoHtml }: { titulo: string; corpoHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${titulo}</title>
  </head>
  <body style="margin:0; padding:32px 16px; background-color:${COR_FUNDO}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
      <tr>
        <td style="padding-bottom:24px; text-align:center;">
          <span style="font-size:18px; font-weight:800; color:${COR_TEXTO};">GestorPro</span>
        </td>
      </tr>
      <tr>
        <td style="background-color:${COR_CARTAO}; border:1px solid ${COR_BORDA}; border-radius:16px; padding:32px 28px;">
          ${corpoHtml}
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px; text-align:center;">
          <span style="font-size:11px; color:${COR_TEXTO_DIM};">GestorPro · Gestão de clientes, vendas e estoque para revenda de streaming</span>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function botao(texto: string, href: string): string {
  return `<a href="${href}" style="display:inline-block; margin-top:20px; padding:13px 26px; background-color:${COR_ACCENT}; color:#04211c; font-weight:700; font-size:14px; text-decoration:none; border-radius:10px;">${texto}</a>`;
}

export function emailRecuperacaoSenha({ nome, linkRecuperacao }: { nome: string; linkRecuperacao: string }): { subject: string; html: string } {
  const primeiroNome = nome.trim().split(" ")[0] || nome;
  const corpoHtml = `
    <h1 style="margin:0 0 12px; font-size:20px; font-weight:800; color:${COR_TEXTO};">Redefinir sua senha</h1>
    <p style="margin:0 0 4px; font-size:14px; line-height:1.6; color:${COR_TEXTO_DIM};">Oi, ${primeiroNome}.</p>
    <p style="margin:0; font-size:14px; line-height:1.6; color:${COR_TEXTO_DIM};">
      Recebemos um pedido pra redefinir a senha da sua conta no GestorPro. Clique no botão abaixo pra escolher uma nova senha —
      o link vale por 1 hora.
    </p>
    ${botao("Redefinir senha", linkRecuperacao)}
    <p style="margin:24px 0 0; font-size:12px; line-height:1.6; color:${COR_TEXTO_DIM};">
      Se não foi você quem pediu, pode ignorar este e-mail — sua senha continua a mesma.
    </p>
  `;
  return {
    subject: "Redefinir sua senha — GestorPro",
    html: layoutEmail({ titulo: "Redefinir sua senha", corpoHtml }),
  };
}
