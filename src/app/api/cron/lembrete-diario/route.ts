import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { faixaVencimento } from "@/lib/planos";
import { enviarPush } from "@/lib/push";
import { dadosMes } from "@/lib/relatorio";

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

  // No último dia do mês, arquiva o resultado de cada revendedor sem
  // precisar que ele clique em nada (igual ao protótipo original).
  const ultimoDiaDoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const ehUltimoDia = agora.getDate() === ultimoDiaDoMes;

  let suspensos = 0;
  let notificados = 0;
  let fechados = 0;

  for (const revendedor of revendedores) {
    const clientes = await prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
    });

    if (ehUltimoDia) {
      const jaFechou = await prisma.fechamentoMes.findUnique({
        where: {
          revendedorId_ano_mes: { revendedorId: revendedor.id, ano: agora.getFullYear(), mes: agora.getMonth() },
        },
      });
      if (!jaFechou) {
        const dados = await dadosMes(revendedor.id, agora.getFullYear(), agora.getMonth());
        await prisma.fechamentoMes.create({
          data: {
            revendedorId: revendedor.id,
            ano: agora.getFullYear(),
            mes: agora.getMonth(),
            receita: dados.receita,
            custo: dados.custo,
            lucro: dados.lucro,
            clientesAtivos: clientes.length,
          },
        });
        fechados++;
      }
    }

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

  // Resumo da plataforma pro(s) administrador(es) — trials vencendo em
  // breve e pagamentos de assinatura recusados nas últimas 24h. Separado do
  // loop acima porque não depende do statusAssinatura do admin (o acesso
  // dele nunca é bloqueado por assinatura).
  const admins = await prisma.revendedor.findMany({
    where: { papel: "ADMIN" },
    include: { pushSubscriptions: true },
  });

  let notificadosAdmin = 0;
  if (admins.some((a) => a.pushSubscriptions.length > 0)) {
    const em3Dias = new Date(agora.getTime() + 3 * 24 * 60 * 60000);
    const ontem = new Date(agora.getTime() - 24 * 60 * 60000);

    const [trialsVencendoCount, recusadosCount] = await Promise.all([
      prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL", trialFim: { lte: em3Dias } } }),
      prisma.pagamento.count({
        where: { tipo: "ASSINATURA", status: "RECUSADO", atualizadoEm: { gte: ontem } },
      }),
    ]);

    if (trialsVencendoCount > 0 || recusadosCount > 0) {
      const partesAdmin: string[] = [];
      if (trialsVencendoCount > 0) partesAdmin.push(`${trialsVencendoCount} trial${trialsVencendoCount === 1 ? "" : "s"} vencendo`);
      if (recusadosCount > 0) partesAdmin.push(`${recusadosCount} pagamento${recusadosCount === 1 ? "" : "s"} recusado${recusadosCount === 1 ? "" : "s"}`);

      for (const admin of admins) {
        for (const inscricao of admin.pushSubscriptions) {
          const manter = await enviarPush(inscricao, {
            titulo: "Resumo do GestorPro",
            corpo: `${partesAdmin.join(" e ")}. Toque para ver.`,
            url: "/admin",
          });
          if (!manter) {
            await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
          }
          notificadosAdmin++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, revendedores: revendedores.length, suspensos, notificados, notificadosAdmin, fechados });
}
