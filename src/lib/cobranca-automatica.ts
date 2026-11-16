import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import { enviarMensagemWhatsapp, ErroWhatsappCloudApi } from "@/lib/integracoes/whatsapp-cloud-api";
import { mesclarModelos, preencherModelo } from "@/lib/mensagens";
import { diasParaVencer, PLANO_LABEL } from "@/lib/planos";
import { brl, dataCurta, diaCivilBr, brMidnightUTC } from "@/lib/format";

type RevendedorComToggles = {
  id: string;
  whatsappTelefoneNumeroId: string | null;
  whatsappTokenCriptografado: string | null;
  whatsappBotAtivo: boolean;
  lembreteAntesAtivo: boolean;
  avisoVencimentoAtivo: boolean;
  cobrancaAposVencerAtiva: boolean;
};

type ClienteParaCobranca = {
  id: string;
  nome: string;
  whatsapp: string | null;
  vencimento: Date;
  plano: keyof typeof PLANO_LABEL;
  valorPlano: number;
  servico: { nome: string } | null;
};

// Disparo automático (via WhatsApp Cloud API) da mensagem "Lembrete" nos
// três momentos que o revendedor liga em Configurações · Cobrança e
// WhatsApp — 3 dias antes, no dia, e a cada 3 dias depois de vencido (até
// 2 vezes). Cada envio grava um Cobranca (mesmo registro que a cobrança
// manual usa) marcado com sufixo "-auto", tanto pra aparecer junto no
// histórico/pontualidade do cliente quanto pra servir de trava contra
// mandar de novo no mesmo dia se o cron rodar mais de uma vez.
export async function enviarCobrancasAutomaticas(revendedor: RevendedorComToggles, clientes: ClienteParaCobranca[]): Promise<number> {
  if (!revendedor.whatsappTelefoneNumeroId || !revendedor.whatsappBotAtivo || !revendedor.whatsappTokenCriptografado) {
    return 0;
  }
  if (!revendedor.lembreteAntesAtivo && !revendedor.avisoVencimentoAtivo && !revendedor.cobrancaAposVencerAtiva) {
    return 0;
  }

  const agora = new Date();
  const hojeCivil = diaCivilBr(agora);
  // brMidnightUTC, não new Date(ano, mes, dia): esse último monta meia-noite
  // no fuso do servidor (UTC em produção), que são 21h de ontem em
  // Brasília — comparado contra Cobranca.criadoEm (instante real) abaixo,
  // isso alargava a janela de "já mandou hoje" pra incluir as 21h-23h59 de
  // ontem (mesmo bug já corrigido em dados-admin.ts/receitaMensalAdmin).
  const inicioDeHoje = brMidnightUTC(hojeCivil.ano, hojeCivil.mes, hojeCivil.dia);

  const overrides = await prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } });
  const modelos = mesclarModelos(overrides);

  let token: string;
  try {
    token = descriptografar(revendedor.whatsappTokenCriptografado);
  } catch {
    return 0;
  }

  // Pré-calcula a etapa de cada cliente (puro, sem tocar o banco) antes de
  // decidir o que já foi enviado — permite buscar o histórico de Cobranca
  // numa query só por tipo de janela, em vez de 1 count/findFirst POR
  // CLIENTE dentro do loop (chegava a 1 round-trip ao banco por cliente
  // vencendo, multiplicado por todos os revendedores em paralelo no cron).
  type Candidato = {
    cliente: ClienteParaCobranca;
    telefone: string;
    dias: number;
    etapa: "lembrete-3d" | "vencimento-dia" | "vencido-3-3";
    modeloTag: string;
  };
  const candidatos: Candidato[] = [];
  for (const cliente of clientes) {
    if (!cliente.whatsapp) continue;
    const dias = diasParaVencer(cliente.vencimento, agora);

    let etapa: Candidato["etapa"] | null = null;
    if (dias === 3 && revendedor.lembreteAntesAtivo) etapa = "lembrete-3d";
    else if (dias === 0 && revendedor.avisoVencimentoAtivo) etapa = "vencimento-dia";
    else if (dias < 0 && revendedor.cobrancaAposVencerAtiva && Math.abs(dias) % 3 === 0) etapa = "vencido-3-3";
    if (!etapa) continue;

    candidatos.push({ cliente, telefone: cliente.whatsapp, dias, etapa, modeloTag: `${etapa}-auto` });
  }
  if (candidatos.length === 0) return 0;

  const clienteIds = candidatos.map((c) => c.cliente.id);

  // "vencido-3-3" precisa do histórico inteiro (máximo 2 disparos pra
  // sempre); lembrete/aviso do dia só precisa do que já rodou hoje — por
  // isso duas buscas com janelas diferentes, mas cada uma ainda é 1 query só
  // pra todos os clientes do revendedor, nunca 1 por cliente.
  const [historicoVencido, jaHojeRows] = await Promise.all([
    prisma.cobranca.findMany({
      where: { clienteId: { in: clienteIds }, modelo: "vencido-3-3-auto" },
      select: { clienteId: true },
    }),
    prisma.cobranca.findMany({
      where: {
        clienteId: { in: clienteIds },
        modelo: { in: ["lembrete-3d-auto", "vencimento-dia-auto"] },
        criadoEm: { gte: inicioDeHoje },
      },
      select: { clienteId: true, modelo: true },
    }),
  ]);

  const contagemVencido = new Map<string, number>();
  for (const row of historicoVencido) {
    contagemVencido.set(row.clienteId, (contagemVencido.get(row.clienteId) ?? 0) + 1);
  }
  const jaHojeSet = new Set(jaHojeRows.map((r) => `${r.clienteId}:${r.modelo}`));

  let enviados = 0;

  for (const { cliente, telefone, dias, etapa, modeloTag } of candidatos) {
    if (etapa === "vencido-3-3") {
      if ((contagemVencido.get(cliente.id) ?? 0) >= 2) continue;
    } else {
      if (jaHojeSet.has(`${cliente.id}:${modeloTag}`)) continue;
    }

    const vencido = dias < 0;
    const texto = preencherModelo(modelos[vencido ? "Vencido" : "Lembrete"] ?? "", {
      nome: cliente.nome,
      app: cliente.servico?.nome ?? "",
      plano: PLANO_LABEL[cliente.plano],
      vencimento: dataCurta(cliente.vencimento),
      prazo: vencido ? `vencido há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}` : `em ${dias} dia${dias === 1 ? "" : "s"}`,
      valor: brl(cliente.valorPlano),
    });

    try {
      await enviarMensagemWhatsapp({
        phoneNumberId: revendedor.whatsappTelefoneNumeroId,
        token,
        para: telefone,
        texto,
      });
      await prisma.cobranca.create({ data: { clienteId: cliente.id, modelo: modeloTag } });
      enviados++;
    } catch (erro) {
      if (!(erro instanceof ErroWhatsappCloudApi)) throw erro;
      // Falha de envio (número inválido, token expirado etc) não pode
      // derrubar o cron inteiro pros outros clientes/revendedores.
    }
  }

  return enviados;
}
