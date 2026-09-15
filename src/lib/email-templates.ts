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
// Faixa do cabeçalho um tom mais escura que o card, pra separar visualmente
// do corpo sem introduzir uma cor nova fora da paleta já usada no app.
const COR_FAIXA = "#081c24";
const COR_AVISO_BORDA = "#3a5a1f";
const COR_AVISO_FUNDO = "#132a17";
const COR_AVISO_TEXTO = "#b8e6a0";

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
        <td style="background-color:${COR_CARTAO}; border:1px solid ${COR_BORDA}; border-radius:16px; overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color:${COR_FAIXA}; padding:28px 28px 24px; text-align:center;">
                <div style="margin:0 auto 12px;">
                  <svg width="44" height="44" viewBox="0 0 100 100" role="img" aria-label="GestorPro">
                    <circle cx="50" cy="50" r="32" fill="none" stroke="${COR_ACCENT}" stroke-width="13" stroke-linecap="round" stroke-dasharray="167.55 33.51" />
                    <circle cx="82" cy="50" r="8" fill="#1d6a70" />
                  </svg>
                </div>
                <span style="font-size:17px; font-weight:800; color:${COR_TEXTO};">GestorPro</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 28px;">
                ${corpoHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px; text-align:center;">
          <span style="font-size:11px; color:${COR_TEXTO_DIM};">GestorPro</span>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function botao(texto: string, href: string): string {
  return `<a href="${href}" style="display:inline-block; margin-top:20px; padding:13px 26px; background-color:${COR_ACCENT}; color:#04211c; font-weight:700; font-size:14px; text-decoration:none; border-radius:10px;">${texto}</a>`;
}

export function emailRecuperacaoSenha({
  nome,
  email,
  linkRecuperacao,
}: {
  nome: string;
  email: string;
  linkRecuperacao: string;
}): { subject: string; html: string } {
  const primeiroNome = nome.trim().split(" ")[0] || nome;
  const corpoHtml = `
    <h1 style="margin:0 0 12px; font-size:20px; font-weight:800; color:${COR_TEXTO};">Oi, ${primeiroNome} — redefinição de senha</h1>
    <p style="margin:0; font-size:14px; line-height:1.6; color:${COR_TEXTO_DIM};">
      Recebemos um pedido pra redefinir a senha da conta do GestorPro associada a este e-mail
      (<a href="mailto:${email}" style="color:${COR_ACCENT}; text-decoration:none;">${email}</a>).
      Clique no botão abaixo pra escolher uma nova senha.
    </p>
    <p style="margin:16px 0 0; font-size:13px; line-height:1.6; color:${COR_TEXTO_DIM};">
      Por segurança, o link é válido por <strong style="color:${COR_TEXTO};">1 hora</strong> e só pode ser usado <strong style="color:${COR_TEXTO};">uma vez</strong>.
    </p>
    ${botao("Redefinir minha senha", linkRecuperacao)}
    <p style="margin:20px 0 0; font-size:12px; line-height:1.6; color:${COR_TEXTO_DIM};">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${linkRecuperacao}" style="color:${COR_ACCENT}; word-break:break-all;">${linkRecuperacao}</a>
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="background-color:${COR_AVISO_FUNDO}; border:1px solid ${COR_AVISO_BORDA}; border-radius:10px; padding:14px 16px;">
          <p style="margin:0; font-size:12px; line-height:1.6; color:${COR_AVISO_TEXTO};">
            <strong>Não foi você?</strong> Se você não pediu essa redefinição, pode ignorar este e-mail com tranquilidade — sua senha
            continua a mesma e nenhuma alteração foi feita na sua conta.
          </p>
        </td>
      </tr>
    </table>
  `;
  return {
    subject: "Redefinir sua senha — GestorPro",
    html: layoutEmail({ titulo: "Redefinir sua senha", corpoHtml }),
  };
}
