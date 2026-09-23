import { prisma } from "@/lib/prisma";
import { descriptografar } from "@/lib/crypto";
import { enviarMensagemWhatsapp, ErroWhatsappCloudApi } from "@/lib/integracoes/whatsapp-cloud-api";
import { mesclarModelos, preencherModelo } from "@/lib/mensagens";
import { diasParaVencer, PLANO_LABEL } from "@/lib/planos";
import { brl, dataCurta, diaCivilBr } from "@/lib/format";

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
  const inicioDeHoje = new Date(hojeCivil.ano, hojeCivil.mes, hojeCivil.dia);

  const overrides = await prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } });
  const modelos = mesclarModelos(overrides);

  let token: string;
  try {
    token = descriptografar(revendedor.whatsappTokenCriptografado);
  } catch {
    return 0;
  }

  let enviados = 0;

  for (const cliente of clientes) {
    if (!cliente.whatsapp) continue;
    const dias = diasParaVencer(cliente.vencimento, agora);

    let etapa: "lembrete-3d" | "vencimento-dia" | "vencido-3-3" | null = null;
    if (dias === 3 && revendedor.lembreteAntesAtivo) etapa = "lembrete-3d";
    else if (dias === 0 && revendedor.avisoVencimentoAtivo) etapa = "vencimento-dia";
    else if (dias < 0 && revendedor.cobrancaAposVencerAtiva && Math.abs(dias) % 3 === 0) etapa = "vencido-3-3";
    if (!etapa) continue;

    const modeloTag = `${etapa}-auto`;

    if (etapa === "vencido-3-3") {
      // No máximo 2 disparos automáticos depois do vencimento — conta todo
      // o histórico dessa etapa pra esse cliente, não só hoje.
      const jaEnviados = await prisma.cobranca.count({ where: { clienteId: cliente.id, modelo: modeloTag } });
      if (jaEnviados >= 2) continue;
    } else {
      // Lembrete/aviso do dia só uma vez — evita duplicar se o cron rodar
      // de novo no mesmo dia.
      const jaHoje = await prisma.cobranca.findFirst({
        where: { clienteId: cliente.id, modelo: modeloTag, criadoEm: { gte: inicioDeHoje } },
      });
      if (jaHoje) continue;
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
        para: cliente.whatsapp,
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
