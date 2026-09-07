import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { ASSESSOR_TOOLS, executarFerramenta } from "./tools";

// claude-opus-5 é o modelo recomendado por padrão para agentes com tool
// use — dá pra trocar via env se algum dia o custo por mensagem pesar
// demais pro volume de um revendedor específico.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

// Quantas mensagens (usuário + assistente) recarregar como contexto da
// conversa a cada nova mensagem do WhatsApp — a API do Claude não guarda
// estado sozinha, então cada chamada reenvia o histórico recente.
const HISTORICO_MAX_MENSAGENS = 20;
const MAX_ITERACOES_FERRAMENTA = 6;

function promptSistema(nomeRevendedor: string): string {
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `Você é o assessor de IA do GestorPro, conversando por WhatsApp com ${nomeRevendedor}, um revendedor de streaming que usa o GestorPro pra gerenciar clientes, vendas e cobranças.

Hoje é ${hoje}. Você tem ferramentas para consultar e alterar os dados do GestorPro deste revendedor — sempre escopadas só aos dados dele.

Regras:
- Responda em português do Brasil, direto e curto — é uma conversa de WhatsApp, não um relatório. Sem markdown (sem #, sem **negrito**), no máximo um ou dois parágrafos curtos, listas com "-" quando fizer sentido.
- Use as ferramentas sempre que a pergunta depender de dados reais (nunca invente números de clientes, valores ou vencimentos).
- Se "buscar_cliente" ou outra ferramenta retornar "multiplosResultados", pergunte qual cliente exatamente antes de agir.
- Ações que mexem em dinheiro ou dados do cliente (criar_cliente, renovar_cliente, registrar_venda, enviar_cobranca) já foram autorizadas pelo próprio dono da conta ao ativar o assessor — pode executar direto quando o pedido for claro, só confirme antes se faltar alguma informação necessária.
- Se uma ferramenta retornar "erro", explique o motivo pro revendedor em vez de tentar de novo do mesmo jeito.`;
}

export class AssessorNaoConfiguradoError extends Error {}

export async function responderMensagemAssessor(revendedorId: string, nomeRevendedor: string, mensagemUsuario: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new AssessorNaoConfiguradoError("ANTHROPIC_API_KEY não configurada");

  const client = new Anthropic();

  const historico = await prisma.conversaAssessor.findMany({
    where: { revendedorId },
    orderBy: { criadoEm: "desc" },
    take: HISTORICO_MAX_MENSAGENS,
  });
  historico.reverse();

  const messages: Anthropic.MessageParam[] = historico.map((m) => ({
    role: m.papel === "assistant" ? "assistant" : "user",
    content: m.conteudo,
  }));
  messages.push({ role: "user", content: mensagemUsuario });

  let textoFinal = "";

  try {
    for (let iteracao = 0; iteracao < MAX_ITERACOES_FERRAMENTA; iteracao++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: promptSistema(nomeRevendedor),
        tools: ASSESSOR_TOOLS,
        messages,
      });

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      textoFinal = textBlocks
        .map((b) => b.text)
        .join("\n")
        .trim();

      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (toolUseBlocks.length === 0) break;

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const bloco of toolUseBlocks) {
        let resultado: string;
        try {
          resultado = await executarFerramenta(bloco.name, bloco.input, { revendedorId });
        } catch (erro) {
          console.error(`Assessor: falha ao executar ferramenta ${bloco.name}`, erro);
          resultado = JSON.stringify({ erro: "Falha interna ao executar a ação — tente novamente." });
        }
        toolResults.push({ type: "tool_result", tool_use_id: bloco.id, content: resultado });
      }
      messages.push({ role: "user", content: toolResults });
    }
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) {
      console.error("Assessor: ANTHROPIC_API_KEY inválida", erro);
      return "O assessor de IA não está configurado corretamente (chave da Anthropic inválida). Avise o suporte do GestorPro.";
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return "Estou com muita gente me chamando agora — tenta de novo em um minutinho?";
    }
    if (erro instanceof Anthropic.APIError) {
      console.error("Assessor: erro da API da Anthropic", erro);
      return "Tive um problema técnico agora pra responder. Tenta de novo em instantes.";
    }
    throw erro;
  }

  if (!textoFinal) textoFinal = "Não consegui concluir isso agora — pode tentar de novo?";

  await prisma.conversaAssessor.createMany({
    data: [
      { revendedorId, papel: "user", conteudo: mensagemUsuario },
      { revendedorId, papel: "assistant", conteudo: textoFinal },
    ],
  });

  // Poda o histórico antigo pra não crescer pra sempre — mantém só o
  // suficiente pra reconstruir o contexto das próximas conversas.
  const antigos = await prisma.conversaAssessor.findMany({
    where: { revendedorId },
    orderBy: { criadoEm: "desc" },
    skip: HISTORICO_MAX_MENSAGENS * 2,
    select: { id: true },
  });
  if (antigos.length > 0) {
    await prisma.conversaAssessor.deleteMany({ where: { id: { in: antigos.map((a) => a.id) } } });
  }

  return textoFinal;
}
