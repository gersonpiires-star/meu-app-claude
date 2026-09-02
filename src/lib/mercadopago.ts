import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function tokenPlataforma() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN não configurado");
  return token;
}

export async function criarPreferencia({
  accessToken,
  pagamentoId,
  titulo,
  valor,
  emailPagador,
  urlRetorno,
}: {
  accessToken: string;
  pagamentoId: string;
  titulo: string;
  valor: number;
  emailPagador?: string;
  urlRetorno: string;
}) {
  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const resposta = await preference.create({
    body: {
      items: [
        {
          id: pagamentoId,
          title: titulo,
          quantity: 1,
          unit_price: valor,
          currency_id: "BRL",
        },
      ],
      payer: emailPagador ? { email: emailPagador } : undefined,
      external_reference: pagamentoId,
      // O pagamentoId vai na própria URL do webhook (não no payload do MP,
      // que não é confiável) para sabermos qual token consultar na resposta.
      notification_url: `${baseUrl()}/api/webhooks/mercadopago?pagamentoId=${pagamentoId}`,
      back_urls: {
        success: urlRetorno,
        pending: urlRetorno,
        failure: urlRetorno,
      },
      auto_return: "approved",
    },
  });

  return resposta;
}

export async function buscarPagamentoMP(accessToken: string, mpPaymentId: string) {
  const client = new MercadoPagoConfig({ accessToken });
  const payment = new Payment(client);
  return payment.get({ id: mpPaymentId });
}
