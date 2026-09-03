import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { faixaVencimento } from "@/lib/planos";
import { enviarPush } from "@/lib/push";

// Disparado uma vez por dia pelo Cron da Vercel (ver vercel.json). Faz duas
// coisas de manhã, por revendedor: aplica a suspensão automática de quem
// ficou vencido além do prazo configurado, e manda um push resumindo quem
// está vencendo/vencido pra quem ativou o lembrete em Configurações.
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const agora = new Date();

  // Limpa tentativas de login antigas — só servem pra bloquear força bruta
  // numa janela de 15 min, não precisam ficar guardadas depois disso.
  await prisma.tentativaLogin
    .deleteMany({ where: { criadoEm: { lt: new Date(agora.getTime() - 24 * 60 * 60000) } } })
    .catch(() => {});

  const revendedores = await prisma.revendedor.findMany({
    where: { statusAssinatura: { in: ["ATIVO", "TRIAL"] } },
    include: { pushSubscriptions: true },
  });

  let suspensos = 0;
  let notificados = 0;

  for (const revendedor of revendedores) {
    const clientes = await prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
    });

    if (revendedor.diasParaCancelarAutomatico) {
      for (const cliente of clientes) {
        const diasVencido = Math.floor((agora.getTime() - cliente.vencimento.getTime()) / 86400000);
        if (diasVencido >= revendedor.diasParaCancelarAutomatico) {
          await prisma.cliente.update({
            where: { id: cliente.id },
            data: {
              status: "CANCELADO",
              motivoSaida: "Suspensão automática por atraso no pagamento",
              motivoSaidaData: agora,
            },
          });
          suspensos++;
        }
      }
    }

    if (revendedor.pushSubscriptions.length === 0) continue;

    const emRisco = clientes.filter((c) => {
      const faixa = faixaVencimento(c.vencimento, agora);
      return faixa === "VENCIDO" || faixa === "ATE_5_DIAS";
    });
    if (emRisco.length === 0) continue;

    const vencidosCount = emRisco.filter((c) => faixaVencimento(c.vencimento, agora) === "VENCIDO").length;
    const vencendoCount = emRisco.length - vencidosCount;
    const partes: string[] = [];
    if (vencidosCount > 0) partes.push(`${vencidosCount} vencido${vencidosCount === 1 ? "" : "s"}`);
    if (vencendoCount > 0) partes.push(`${vencendoCount} vencendo`);

    for (const inscricao of revendedor.pushSubscriptions) {
      const manter = await enviarPush(inscricao, {
        titulo: "Clientes pra cobrar hoje",
        corpo: `Você tem ${partes.join(" e ")}. Toque para ver.`,
        url: "/painel",
      });
      if (!manter) {
        await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
      }
      notificados++;
    }
  }

  return NextResponse.json({ ok: true, revendedores: revendedores.length, suspensos, notificados });
}
