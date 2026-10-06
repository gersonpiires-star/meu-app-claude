import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { faixaVencimento } from "@/lib/planos";
import { enviarPush } from "@/lib/push";
import { dadosMes, resumoUltimos7Dias } from "@/lib/relatorio";
import { diaCivilBr, diaDaSemana } from "@/lib/format";
import { enviarCobrancasAutomaticas } from "@/lib/cobranca-automatica";
import { ehAniversarioDeCasa } from "@/lib/aniversario";
import { enviarEmail } from "@/lib/email";
import { emailRelatorioSemanal } from "@/lib/email-templates";

// "A, B e C" em vez de "A e B e C" — só usado pra montar o corpo do push
// diário, que pode juntar até 3 fatos (vencidos/vencendo/aniversariantes).
function juntarComE(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

function diasEntreCivil(de: Date, ate: Date): number {
  const d = diaCivilBr(de);
  const a = diaCivilBr(ate);
  return Math.round((new Date(a.ano, a.mes, a.dia).getTime() - new Date(d.ano, d.mes, d.dia).getTime()) / 86400000);
}

// Mensagens de nutrição do trial — só nos dias 1, 3 e 6 (trial dura 7 dias),
// pra ajudar quem está testando a converter, sem virar spam.
function mensagemNutricaoTrial(diasDeTrial: number, totalClientes: number): { titulo: string; corpo: string; url: string } | null {
  if (diasDeTrial === 1) {
    return {
      titulo: "Bem-vindo ao GestorPro!",
      corpo:
        totalClientes > 0
          ? "Você já começou! Continue cadastrando seus clientes pra ver tudo funcionando."
          : "Cadastre seu primeiro cliente — leva 1 minuto e você já sente como o app funciona.",
      url: "/clientes/novo",
    };
  }
  if (diasDeTrial === 3) {
    return {
      titulo: "Como está indo o teste?",
      corpo:
        totalClientes > 0
          ? `Você já tem ${totalClientes} cliente${totalClientes === 1 ? "" : "s"} cadastrado${totalClientes === 1 ? "" : "s"}. Dá uma olhada no Relatório pra ver sua receita projetada.`
          : "Ainda não cadastrou nenhum cliente? Cadastre agora e organize sua revenda em minutos.",
      url: totalClientes > 0 ? "/relatorio" : "/clientes/novo",
    };
  }
  if (diasDeTrial === 6) {
    return {
      titulo: "Seu trial termina amanhã",
      corpo: "Gostou do GestorPro? Assine agora pra não perder o acesso aos seus dados.",
      url: "/assinatura",
    };
  }
  return null;
}

// Disparado uma vez por dia pelo Cron da Vercel (ver vercel.json). Faz
// várias coisas de manhã, por revendedor: aplica a suspensão automática de
// quem ficou vencido além do prazo configurado, manda um push resumindo
// quem está vencendo/vencido pra quem ativou o lembrete em Configurações,
// e nutre quem está em trial nos dias-chave pra ajudar a converter.
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const agora = new Date();
  const agoraCivil = diaCivilBr(agora);

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
  const ultimoDiaDoMes = new Date(agoraCivil.ano, agoraCivil.mes + 1, 0).getDate();
  const ehUltimoDia = agoraCivil.dia === ultimoDiaDoMes;
  const ehSegunda = diaDaSemana(agoraCivil) === 1;
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  let suspensos = 0;
  let notificados = 0;
  let fechados = 0;
  let nutridos = 0;
  let cobrancasAutomaticas = 0;
  let relatoriosSemanais = 0;

  for (const revendedor of revendedores) {
    const clientes = await prisma.cliente.findMany({
      where: { revendedorId: revendedor.id, status: { not: "CANCELADO" } },
      include: { servico: { select: { nome: true } } },
    });

    cobrancasAutomaticas += await enviarCobrancasAutomaticas(revendedor, clientes);

    if (ehSegunda && revendedor.relatorioSemanalAtivo) {
      try {
        const resumo = await resumoUltimos7Dias(revendedor.id, agora);
        const { subject, html } = emailRelatorioSemanal({
          nome: revendedor.nome,
          receita: resumo.receita,
          lucro: resumo.lucro,
          renovacoes: resumo.renovacoes,
          vendas: resumo.vendas,
          clientesNovos: resumo.clientesNovos,
          cancelados: resumo.cancelados,
          vencidos: resumo.vencidos,
          vencendo: resumo.vencendo,
          linkRelatorio: `${baseUrl}/relatorio`,
        });
        await enviarEmail({ to: revendedor.email, subject, html });
        relatoriosSemanais++;
      } catch (erro) {
        // E-mail é best-effort aqui — uma falha no Resend (ou revendedor
        // sem e-mail válido) não pode interromper o resto do cron pros
        // outros revendedores, mesma lógica de enviarCobrancasAutomaticas.
        console.error(`Falha ao enviar relatório semanal pro revendedor ${revendedor.id}`, erro);
      }
    }

    if (ehUltimoDia) {
      const jaFechou = await prisma.fechamentoMes.findUnique({
        where: {
          revendedorId_ano_mes: { revendedorId: revendedor.id, ano: agoraCivil.ano, mes: agoraCivil.mes },
        },
      });
      if (!jaFechou) {
        const dados = await dadosMes(revendedor.id, agoraCivil.ano, agoraCivil.mes);
        try {
          await prisma.fechamentoMes.create({
            data: {
              revendedorId: revendedor.id,
              ano: agoraCivil.ano,
              mes: agoraCivil.mes,
              receita: dados.receita,
              custo: dados.custo,
              lucro: dados.lucro,
              clientesAtivos: clientes.length,
            },
          });
          fechados++;
        } catch (erro) {
          // Duas execuções desse cron sobrepostas podiam ambas passar pela
          // checagem "jaFechou" acima e colidir aqui na constraint única —
          // sem esse catch, o erro não tratado interrompia o loop inteiro,
          // pulando suspensão automática e notificações de TODOS os
          // revendedores seguintes na lista, não só desse.
          if (!(erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002")) throw erro;
        }
      }
    }

    if (revendedor.diasParaCancelarAutomatico) {
      for (const cliente of clientes) {
        // Precisa ser diferença de dia CIVIL (Brasília), não de milissegundos
        // brutos entre dois instantes — vencimento só fica ancorado à meia-
        // noite de Brasília quando o cliente tem diaFixo configurado
        // (calcularVencimentoComDiaFixo em lib/planos.ts); sem diaFixo, ele
        // carrega o horário exato em que a renovação/cadastro foi feito.
        // Subtrair milissegundos direto contava esse resto de horas como
        // fração de dia perdida ou ganha, atrasando ou adiantando a
        // suspensão automática em relação ao que a própria tela já mostra
        // como "vencido há N dias" (que usa diasParaVencer/diaCivilBr).
        const diasVencido = diasEntreCivil(cliente.vencimento, agora);
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

    if (revendedor.statusAssinatura === "TRIAL") {
      const mensagem = mensagemNutricaoTrial(diasEntreCivil(revendedor.criadoEm, agora), clientes.length);
      if (mensagem) {
        for (const inscricao of revendedor.pushSubscriptions) {
          const manter = await enviarPush(inscricao, mensagem);
          if (!manter) await prisma.pushSubscription.delete({ where: { id: inscricao.id } }).catch(() => {});
          nutridos++;
        }
      }
    }

    // Só entra quem a fila de "Cobrar em lote" também mostra (ela exige
    // WhatsApp cadastrado pra montar a mensagem) — sem esse filtro aqui, o
    // push contava gente que, ao abrir o link, não aparecia na fila.
    const emRisco = clientes.filter((c) => {
      const faixa = faixaVencimento(c.vencimento, agora);
      return (faixa === "VENCIDO" || faixa === "ATE_5_DIAS") && c.whatsapp;
    });
    if (emRisco.length === 0) continue;

    const vencidosCount = emRisco.filter((c) => faixaVencimento(c.vencimento, agora) === "VENCIDO").length;
    const vencendoCount = emRisco.length - vencidosCount;
    const aniversariantesCount = clientes.filter((c) => ehAniversarioDeCasa(c.criadoEm, agora).ehAniversario).length;
    const partes: string[] = [];
    if (vencidosCount > 0) partes.push(`${vencidosCount} vencido${vencidosCount === 1 ? "" : "s"}`);
    if (vencendoCount > 0) partes.push(`${vencendoCount} vencendo`);
    // Só entra no mesmo push de cobrança (não dispara um push à parte) —
    // o painel já mostra a lista de aniversariantes pra quem entra sem
    // ter ninguém pra cobrar hoje.
    if (aniversariantesCount > 0) partes.push(`${aniversariantesCount} fazendo aniversário de casa`);

    for (const inscricao of revendedor.pushSubscriptions) {
      // Manda direto pra fila de cobrança já pronta pra disparar (mensagem
      // preenchida, Pix Copia e Cola incluído) — antes mandava pro Painel,
      // que só mostra o resumo e exige mais um passo pra achar a fila.
      const manter = await enviarPush(inscricao, {
        titulo: "Clientes pra cobrar hoje",
        corpo: `Você tem ${juntarComE(partes)}. Toque para cobrar agora.`,
        url: "/clientes/cobrar-em-lote",
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
      // "Vencendo" precisa continuar futuro — sem o gte, um trial que já
      // venceu há semanas (e nunca foi cancelado) batia lte: em3Dias todo
      // santo dia pra sempre, disparando o aviso mesmo sem nenhum trial de
      // verdade próximo do fim.
      prisma.revendedor.count({
        where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL", trialFim: { gte: agora, lte: em3Dias } },
      }),
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

  return NextResponse.json({
    ok: true,
    revendedores: revendedores.length,
    suspensos,
    notificados,
    notificadosAdmin,
    fechados,
    nutridos,
    cobrancasAutomaticas,
    relatoriosSemanais,
  });
}
