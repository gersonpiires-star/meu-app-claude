import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { confirmarPagamentoCurriculo } from "@/lib/curriculo/pedidos";
import { AtualizarAutomaticamente } from "./atualizar";

export const metadata: Metadata = { title: "Seu currículo em PDF", robots: { index: false, follow: false } };

export default async function PedidoCurriculoPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment_id?: string }>;
}) {
  const { token } = await params;
  const { payment_id } = await searchParams;

  let pedido = await prisma.pedidoCurriculo.findUnique({ where: { token } });
  if (!pedido) notFound();

  // O Mercado Pago devolve o comprador com ?payment_id=... — confirmamos já
  // (consultando a API, sem confiar no parâmetro) em vez de esperar o webhook.
  if (pedido.status === "PENDENTE" && payment_id && /^\d+$/.test(payment_id)) {
    await confirmarPagamentoCurriculo(pedido.id, payment_id).catch((e) => console.error("Currículo: falha ao confirmar no retorno", e));
    pedido = (await prisma.pedidoCurriculo.findUnique({ where: { token } })) ?? pedido;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {pedido.status === "APROVADO" ? (
          <>
            <h1 className="text-lg font-bold">Pagamento aprovado!</h1>
            <p className="mt-2 text-sm text-slate-600">Seu currículo está pronto. Guarde esta página: o link continua valendo para baixar de novo.</p>
            <a
              href={`/api/curriculo/${token}/pdf`}
              className="mt-5 block rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white"
            >
              Baixar currículo em PDF
            </a>
          </>
        ) : pedido.status === "PENDENTE" ? (
          <>
            <h1 className="text-lg font-bold">Aguardando confirmação</h1>
            <p className="mt-2 text-sm text-slate-600">
              Assim que o pagamento for confirmado (o Pix costuma levar poucos segundos), o download aparece aqui.
            </p>
            <AtualizarAutomaticamente />
          </>
        ) : (
          <>
            <h1 className="text-lg font-bold">Pagamento não aprovado</h1>
            <p className="mt-2 text-sm text-slate-600">Não foi possível confirmar o pagamento. Você pode montar o currículo e tentar de novo.</p>
            <a href="/curriculo" className="mt-5 block rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white">
              Voltar ao editor
            </a>
          </>
        )}
      </div>
    </main>
  );
}
