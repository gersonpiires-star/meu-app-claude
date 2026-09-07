import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { PlanoCliente } from "@/generated/prisma/enums";
import {
  PLANO_LABEL,
  PLANO_VALOR_SUGERIDO,
  calcularVencimentoComDiaFixo,
  diasParaVencer,
  faixaVencimento,
} from "@/lib/planos";
import { erroCreditoIndisponivel } from "@/lib/plataformas";
import { estoqueAtualProduto, custoConsumoFifo } from "@/lib/dados";
import { dadosMes } from "@/lib/relatorio";
import { brl, dataCurta, dataPorExtenso } from "@/lib/format";
import { mesclarModelos, preencherModelo, normalizarWhatsappBr } from "@/lib/mensagens";
import { linkPagamentoCliente } from "@/lib/pagamentos";
import { enviarWhatsApp, enviarWhatsAppTemplate, templateLembreteConfigurado } from "@/lib/twilio";

// Toda ferramenta recebe o revendedorId de quem mandou a mensagem no
// WhatsApp (já resolvido pelo webhook a partir do número remetente) —
// nunca confia em nenhum id de revendedor que o modelo possa inventar,
// exatamente como as Server Actions nunca confiam em id vindo do form.
type Ctx = { revendedorId: string };

// Ações que mexem em dinheiro acima desse valor (renovação, venda) ou em
// muitos clientes de uma vez (lembrete em lote) não executam direto — o
// assessor pede confirmação por mensagem antes (ver confirmar_acao_pendente).
const LIMITE_CONFIRMACAO = Number(process.env.ASSESSOR_LIMITE_CONFIRMACAO ?? 100);
const LIMITE_LOTE_SEM_CONFIRMAR = 5;
const PENDENTE_TTL_MS = 10 * 60 * 1000;

async function criarPendente(revendedorId: string, tipo: string, payload: Record<string, unknown>, resumo: string): Promise<string> {
  await prisma.acaoPendenteAssessor.create({ data: { revendedorId, tipo, payload: payload as Prisma.InputJsonValue, resumo } });
  return JSON.stringify({
    confirmacaoNecessaria: true,
    resumo,
    instrucao: "Mostre esse resumo pro revendedor e pergunte se confirma. Só chame confirmar_acao_pendente depois que ele responder claramente.",
  });
}

async function registrarLogAssessor(revendedorId: string, acao: string, descricao: string) {
  try {
    await prisma.logAtividade.create({
      data: { revendedorId, autorNome: "Assessor IA (WhatsApp)", autorTipo: "DONO", acao, descricao },
    });
  } catch (erro) {
    console.error("Assessor: falha ao registrar log de atividade", erro);
  }
}

const PLANOS_VALIDOS = ["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"] as const;

function planoValido(valor: unknown): PlanoCliente | null {
  return typeof valor === "string" && (PLANOS_VALIDOS as readonly string[]).includes(valor) ? (valor as PlanoCliente) : null;
}

// Busca um cliente do revendedor por nome (parcial, sem acento/case) ou
// pelo id exato — usada por toda ferramenta que recebe "clienteNome ou
// clienteId" do modelo, já que o Claude não tem os ids do seu banco de
// cabeça e normalmente vai se referir aos clientes pelo nome.
async function resolverCliente(revendedorId: string, referencia: string) {
  const porId = await prisma.cliente.findFirst({
    where: { id: referencia, revendedorId },
    include: { servico: true },
  });
  if (porId) return porId;

  const candidatos = await prisma.cliente.findMany({
    where: { revendedorId, nome: { contains: referencia, mode: "insensitive" } },
    include: { servico: true },
    orderBy: { nome: "asc" },
    take: 5,
  });
  return candidatos.length === 1 ? candidatos[0] : candidatos;
}

export const ASSESSOR_TOOLS: Anthropic.Tool[] = [
  {
    name: "consultar_clientes",
    description:
      "Lista os clientes do revendedor, opcionalmente filtrados por situação de vencimento. Use para responder perguntas como 'quantos clientes vencem essa semana', 'quem está vencido', 'quantos clientes ativos eu tenho'.",
    input_schema: {
      type: "object",
      properties: {
        situacao: {
          type: "string",
          enum: ["TODOS", "VENCIDOS", "VENCENDO_5_DIAS", "ATIVOS", "CANCELADOS", "TESTE"],
          description: "Filtro de situação. VENCENDO_5_DIAS = vence em até 5 dias (ainda não vencido).",
        },
      },
      required: ["situacao"],
    },
  },
  {
    name: "buscar_cliente",
    description: "Busca um cliente pelo nome (aceita nome parcial) e retorna seus dados completos, incluindo histórico recente de renovações.",
    input_schema: {
      type: "object",
      properties: { nome: { type: "string", description: "Nome ou parte do nome do cliente" } },
      required: ["nome"],
    },
  },
  {
    name: "resumo_financeiro",
    description: "Retorna receita, custo e lucro de um mês (recorrência + vendas de aparelhos). Se ano/mes não forem informados, usa o mês atual.",
    input_schema: {
      type: "object",
      properties: {
        ano: { type: "integer", description: "Ano, ex: 2026" },
        mes: { type: "integer", description: "Mês de 1 a 12" },
      },
      required: [],
    },
  },
  {
    name: "consultar_estoque",
    description: "Lista os produtos (aparelhos) cadastrados e a quantidade atual em estoque de cada um.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "criar_cliente",
    description: "Cadastra um novo cliente para o revendedor.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string" },
        whatsapp: { type: "string", description: "DDD + número do cliente, só dígitos" },
        servico: { type: "string", description: "Nome do serviço/app de streaming, ex: Netflix" },
        plano: { type: "string", enum: PLANOS_VALIDOS as unknown as string[] },
        valorPlano: { type: "number", description: "Valor cobrado do cliente. Se omitido, usa o valor sugerido do plano." },
        telas: { type: "integer", description: "Número de telas/acessos. Padrão 1." },
      },
      required: ["nome", "plano"],
    },
  },
  {
    name: "renovar_cliente",
    description: `Renova o plano de um cliente já existente, estendendo o vencimento a partir de hoje (ou do vencimento atual, se ainda não venceu). Se o valor for ${LIMITE_CONFIRMACAO} ou mais, não executa direto — retorna confirmacaoNecessaria e espera confirmação via confirmar_acao_pendente.`,
    input_schema: {
      type: "object",
      properties: {
        clienteNome: { type: "string", description: "Nome (ou id) do cliente a renovar" },
        plano: { type: "string", enum: PLANOS_VALIDOS as unknown as string[] },
        valor: { type: "number", description: "Valor cobrado nessa renovação. Se omitido, mantém o valor atual do cliente." },
      },
      required: ["clienteNome", "plano"],
    },
  },
  {
    name: "registrar_venda",
    description: `Registra a venda de um produto (aparelho) em estoque, opcionalmente vinculada a um cliente. Se o total (quantidade × valor unitário) for ${LIMITE_CONFIRMACAO} ou mais, não executa direto — retorna confirmacaoNecessaria e espera confirmação via confirmar_acao_pendente.`,
    input_schema: {
      type: "object",
      properties: {
        produtoModelo: { type: "string", description: "Modelo do produto, ex: TV Box X96" },
        quantidade: { type: "integer" },
        valorUnitario: { type: "number" },
        formaPagamento: { type: "string", description: "Ex: Pix, Dinheiro, Cartão" },
        clienteNome: { type: "string", description: "Nome do cliente comprador, se houver" },
      },
      required: ["produtoModelo", "quantidade", "valorUnitario", "formaPagamento"],
    },
  },
  {
    name: "enviar_cobranca",
    description:
      "Envia uma mensagem de cobrança/lembrete de vencimento pelo WhatsApp diretamente para o cliente (não para o revendedor). Só funciona se o cliente tiver um WhatsApp cadastrado e tiver mandado mensagem pro número da Twilio nas últimas 24h — fora dessa janela a Twilio recusa o envio.",
    input_schema: {
      type: "object",
      properties: {
        clienteNome: { type: "string", description: "Nome (ou id) do cliente a cobrar" },
        modelo: { type: "string", enum: ["Lembrete", "Vencido", "Renovação"], description: "Modelo de mensagem a usar" },
      },
      required: ["clienteNome", "modelo"],
    },
  },
  {
    name: "enviar_lembretes_vencimento",
    description:
      `Manda lembrete de vencimento pra VÁRIOS clientes de uma vez, usando um template aprovado pela Meta — por isso funciona mesmo fora da janela de 24h (diferente de enviar_cobranca, que só manda pra um cliente por vez e só dentro da janela). Requer que o GestorPro tenha configurado o template; se não tiver, retorna erro explicando isso. Se atingir mais de ${LIMITE_LOTE_SEM_CONFIRMAR} clientes, não envia direto — retorna confirmacaoNecessaria.`,
    input_schema: {
      type: "object",
      properties: {
        filtro: {
          type: "string",
          enum: ["VENCENDO_5_DIAS", "VENCIDOS"],
          description: "VENCENDO_5_DIAS = ainda não venceu, vence em até 5 dias. VENCIDOS = já vencidos.",
        },
      },
      required: ["filtro"],
    },
  },
  {
    name: "confirmar_acao_pendente",
    description:
      "Confirma ou cancela a última ação que ficou esperando aprovação (renovação/venda de valor alto, ou lembrete em lote). Só chame depois que o revendedor responder claramente sim/não pra pergunta de confirmação — nunca decida sozinho.",
    input_schema: {
      type: "object",
      properties: { confirmar: { type: "boolean", description: "true se o revendedor confirmou, false se cancelou" } },
      required: ["confirmar"],
    },
  },
];

type ClienteResumo = {
  id: string;
  nome: string;
  whatsapp: string | null;
  plano: PlanoCliente;
  valorPlano: number;
  vencimento: Date;
  status: string;
  testeGratis: boolean;
  telas: number;
  servico: { nome: string } | null;
};

function textoCliente(c: ClienteResumo) {
  const dias = diasParaVencer(c.vencimento);
  const situacao =
    c.status === "CANCELADO" ? "cancelado" : faixaVencimento(c.vencimento) === "VENCIDO" ? `vencido há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`;
  return {
    id: c.id,
    nome: c.nome,
    whatsapp: c.whatsapp,
    servico: c.servico?.nome ?? null,
    plano: PLANO_LABEL[c.plano],
    valorPlano: brl(c.valorPlano),
    telas: c.telas,
    vencimento: dataCurta(c.vencimento),
    situacao,
    testeGratis: c.testeGratis,
  };
}

type ResultadoAcao = { ok: true; [chave: string]: unknown } | { ok: false; erro: string };

const FAIXA_POR_FILTRO: Record<string, "ATE_5_DIAS" | "VENCIDO"> = {
  VENCENDO_5_DIAS: "ATE_5_DIAS",
  VENCIDOS: "VENCIDO",
};

// Lógica que de fato renova o cliente — separada do case do switch pra ser
// chamada tanto direto (valor abaixo do limite de confirmação) quanto por
// confirmar_acao_pendente (valor alto, já aprovado pelo revendedor).
async function aplicarRenovacao(ctx: Ctx, clienteId: string, plano: PlanoCliente, valor: number): Promise<ResultadoAcao> {
  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, revendedorId: ctx.revendedorId } });
  if (!cliente) return { ok: false, erro: "Cliente não encontrado — pode ter sido removido nesse meio tempo." };

  const erroCredito = await erroCreditoIndisponivel(prisma, cliente.servicoId);
  if (erroCredito) return { ok: false, erro: erroCredito };

  const base = cliente.vencimento > new Date() ? cliente.vencimento : new Date();
  const novoVencimento = calcularVencimentoComDiaFixo(plano, base, cliente.diaFixo);

  await prisma.$transaction([
    prisma.renovacao.create({ data: { clienteId: cliente.id, plano, valor, custo: 0 } }),
    prisma.cliente.update({
      where: { id: cliente.id },
      data: { plano, valorPlano: valor, vencimento: novoVencimento, status: "ATIVO", testeGratis: false },
    }),
  ]);

  await registrarLogAssessor(
    ctx.revendedorId,
    "cliente.renovar",
    `Renovou o plano de ${cliente.nome} (${PLANO_LABEL[plano]}, ${brl(valor)}) via assessor no WhatsApp`
  );
  return { ok: true, cliente: cliente.nome, novoVencimento: dataCurta(novoVencimento) };
}

type PayloadVenda = { produtoId: string; quantidade: number; valorUnitario: number; formaPagamento: string; clienteId: string | null };

async function aplicarVenda(ctx: Ctx, payload: PayloadVenda): Promise<ResultadoAcao> {
  const produto = await prisma.produto.findFirst({ where: { id: payload.produtoId, revendedorId: ctx.revendedorId } });
  if (!produto) return { ok: false, erro: "Produto não encontrado — pode ter sido removido nesse meio tempo." };

  try {
    await prisma.$transaction(
      async (tx) => {
        const estoque = await estoqueAtualProduto(produto.id, tx);
        if (payload.quantidade > estoque) {
          throw new Error(
            estoque > 0
              ? `Estoque insuficiente — só há ${estoque} unidade(s) de ${produto.modelo}.`
              : `Sem estoque de ${produto.modelo}.`
          );
        }
        const { custoUnitario } = await custoConsumoFifo(produto.id, payload.quantidade, tx);
        await tx.venda.create({
          data: {
            revendedorId: ctx.revendedorId,
            produtoId: produto.id,
            clienteId: payload.clienteId,
            quantidade: payload.quantidade,
            valorUnitario: payload.valorUnitario,
            custoUnitario,
            formaPagamento: payload.formaPagamento,
          },
        });
        await tx.movimentoEstoque.create({
          data: { produtoId: produto.id, tipo: "SAIDA", quantidade: payload.quantidade, custoUnitario },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "Falha ao registrar a venda." };
  }

  await registrarLogAssessor(ctx.revendedorId, "venda.criar", `Registrou venda de ${payload.quantidade}x ${produto.modelo} via assessor no WhatsApp`);
  return { ok: true, produto: produto.modelo, quantidade: payload.quantidade, total: brl(payload.quantidade * payload.valorUnitario) };
}

// Lembrete em lote via Content Template aprovado pela Meta — diferente de
// enviar_cobranca (mensagem livre, só funciona na janela de 24h), esse
// caminho funciona a qualquer momento, então é o certo pra "avisar todo
// mundo que vence essa semana" de forma proativa.
async function aplicarLembretes(ctx: Ctx, filtro: string): Promise<ResultadoAcao> {
  const contentSid = process.env.TWILIO_CONTENT_SID_LEMBRETE;
  if (!contentSid) {
    return {
      ok: false,
      erro: "O template de lembrete de vencimento ainda não foi configurado pelo GestorPro (TWILIO_CONTENT_SID_LEMBRETE). Avise o suporte pra habilitar essa função.",
    };
  }
  const faixaAlvo = FAIXA_POR_FILTRO[filtro] ?? "ATE_5_DIAS";

  const candidatos = await prisma.cliente.findMany({
    where: { revendedorId: ctx.revendedorId, status: { not: "CANCELADO" } },
    include: { servico: true },
  });
  const alvo = candidatos.filter((c) => faixaVencimento(c.vencimento) === faixaAlvo);
  const comWhatsapp = alvo.filter((c) => c.whatsapp);

  let enviados = 0;
  let falharam = 0;
  for (const cliente of comWhatsapp) {
    const envio = await enviarWhatsAppTemplate(normalizarWhatsappBr(cliente.whatsapp!), contentSid, {
      "1": cliente.nome,
      "2": cliente.servico?.nome ?? "seu serviço",
      "3": dataPorExtenso(cliente.vencimento),
      "4": brl(cliente.valorPlano),
    });
    if (envio.ok) {
      enviados++;
      await prisma.cobranca.create({ data: { clienteId: cliente.id, modelo: "Lembrete" } });
    } else {
      falharam++;
    }
  }

  await registrarLogAssessor(
    ctx.revendedorId,
    "cliente.lembrete_lote",
    `Enviou lembrete de vencimento em lote via assessor no WhatsApp (${enviados} enviados, ${falharam} falharam)`
  );

  return { ok: true, enviados, falharam, semWhatsapp: alvo.length - comWhatsapp.length };
}

export async function executarFerramenta(nome: string, input: unknown, ctx: Ctx): Promise<string> {
  const dados = (input ?? {}) as Record<string, unknown>;

  switch (nome) {
    case "consultar_clientes": {
      const situacao = String(dados.situacao ?? "TODOS");
      const clientes = await prisma.cliente.findMany({
        where: { revendedorId: ctx.revendedorId },
        include: { servico: true },
        orderBy: { vencimento: "asc" },
      });

      const filtrados = clientes.filter((c) => {
        if (situacao === "TODOS") return true;
        if (situacao === "CANCELADOS") return c.status === "CANCELADO";
        if (situacao === "TESTE") return c.testeGratis && c.status !== "CANCELADO";
        if (c.status === "CANCELADO") return false;
        if (situacao === "VENCIDOS") return faixaVencimento(c.vencimento) === "VENCIDO";
        if (situacao === "VENCENDO_5_DIAS") return faixaVencimento(c.vencimento) === "ATE_5_DIAS";
        if (situacao === "ATIVOS") return c.status === "ATIVO";
        return true;
      });

      return JSON.stringify({ total: filtrados.length, clientes: filtrados.slice(0, 60).map(textoCliente) });
    }

    case "buscar_cliente": {
      const nomeReferencia = String(dados.nome ?? "").trim();
      if (!nomeReferencia) return JSON.stringify({ erro: "Informe o nome do cliente." });
      const resultado = await resolverCliente(ctx.revendedorId, nomeReferencia);
      if (Array.isArray(resultado)) {
        if (resultado.length === 0) return JSON.stringify({ erro: "Nenhum cliente encontrado com esse nome." });
        return JSON.stringify({
          multiplosResultados: true,
          opcoes: resultado.map((c) => ({ id: c.id, nome: c.nome })),
        });
      }
      const renovacoes = await prisma.renovacao.findMany({
        where: { clienteId: resultado.id },
        orderBy: { data: "desc" },
        take: 3,
      });
      return JSON.stringify({
        ...textoCliente(resultado),
        anotacao: resultado.anotacao,
        ultimasRenovacoes: renovacoes.map((r) => ({ data: dataCurta(r.data), plano: PLANO_LABEL[r.plano], valor: brl(r.valor) })),
      });
    }

    case "resumo_financeiro": {
      const agora = new Date();
      const ano = Number(dados.ano ?? agora.getFullYear());
      const mes = Number(dados.mes ?? agora.getMonth() + 1) - 1;
      const resultado = await dadosMes(ctx.revendedorId, ano, mes);
      return JSON.stringify({
        receita: brl(resultado.receita),
        custo: brl(resultado.custo),
        lucro: brl(resultado.lucro),
        margem: `${resultado.margem.toFixed(1)}%`,
        quantidadeRenovacoes: resultado.renovacoes.length,
        quantidadeVendas: resultado.vendas.length,
        clientesCancelados: resultado.cancelados.length,
      });
    }

    case "consultar_estoque": {
      const produtos = await prisma.produto.findMany({ where: { revendedorId: ctx.revendedorId } });
      const comEstoque = await Promise.all(
        produtos.map(async (p) => ({ modelo: p.modelo, estoqueAtual: await estoqueAtualProduto(p.id), estoqueMinimo: p.estoqueMinimo }))
      );
      return JSON.stringify({ produtos: comEstoque });
    }

    case "criar_cliente": {
      const plano = planoValido(dados.plano);
      const nomeCliente = String(dados.nome ?? "").trim();
      if (!nomeCliente) return JSON.stringify({ erro: "Informe o nome do cliente." });
      if (!plano) return JSON.stringify({ erro: `Plano inválido. Use um de: ${PLANOS_VALIDOS.join(", ")}.` });

      const nomeServico = typeof dados.servico === "string" ? dados.servico.trim() : "";
      let servicoId: string | null = null;
      if (nomeServico) {
        const servico = await prisma.servico.upsert({
          where: { revendedorId_nome: { revendedorId: ctx.revendedorId, nome: nomeServico } },
          update: {},
          create: { revendedorId: ctx.revendedorId, nome: nomeServico },
        });
        servicoId = servico.id;
      }

      const whatsappCliente = typeof dados.whatsapp === "string" ? dados.whatsapp.replace(/\D/g, "") : "";
      const valorPlano = typeof dados.valorPlano === "number" ? dados.valorPlano : PLANO_VALOR_SUGERIDO[plano];
      const telas = Number.isInteger(dados.telas) ? Number(dados.telas) : 1;

      const cliente = await prisma.cliente.create({
        data: {
          revendedorId: ctx.revendedorId,
          servicoId,
          nome: nomeCliente,
          whatsapp: whatsappCliente || null,
          telas,
          plano,
          valorPlano,
          vencimento: calcularVencimentoComDiaFixo(plano, new Date(), null),
          status: "ATIVO",
        },
      });

      await registrarLogAssessor(ctx.revendedorId, "cliente.criar", `Cadastrou o cliente ${cliente.nome} (via assessor no WhatsApp)`);
      return JSON.stringify({ ok: true, cliente: textoCliente({ ...cliente, servico: nomeServico ? { nome: nomeServico } : null }) });
    }

    case "renovar_cliente": {
      const referencia = String(dados.clienteNome ?? "").trim();
      const plano = planoValido(dados.plano);
      if (!referencia) return JSON.stringify({ erro: "Informe o nome do cliente." });
      if (!plano) return JSON.stringify({ erro: `Plano inválido. Use um de: ${PLANOS_VALIDOS.join(", ")}.` });

      const resultado = await resolverCliente(ctx.revendedorId, referencia);
      if (Array.isArray(resultado)) {
        if (resultado.length === 0) return JSON.stringify({ erro: "Nenhum cliente encontrado com esse nome." });
        return JSON.stringify({ multiplosResultados: true, opcoes: resultado.map((c) => ({ id: c.id, nome: c.nome })) });
      }

      const erroCredito = await erroCreditoIndisponivel(prisma, resultado.servicoId);
      if (erroCredito) return JSON.stringify({ erro: erroCredito });

      const valor = typeof dados.valor === "number" ? dados.valor : resultado.valorPlano;

      if (valor >= LIMITE_CONFIRMACAO) {
        const resumo = `Renovar ${resultado.nome} para o plano ${PLANO_LABEL[plano]} por ${brl(valor)}?`;
        return criarPendente(ctx.revendedorId, "renovar_cliente", { clienteId: resultado.id, plano, valor }, resumo);
      }

      return JSON.stringify(await aplicarRenovacao(ctx, resultado.id, plano, valor));
    }

    case "registrar_venda": {
      const modelo = String(dados.produtoModelo ?? "").trim();
      const quantidade = Number(dados.quantidade ?? 0);
      const valorUnitario = Number(dados.valorUnitario ?? 0);
      const formaPagamento = String(dados.formaPagamento ?? "").trim();
      if (!modelo || !(quantidade > 0) || !formaPagamento) {
        return JSON.stringify({ erro: "Informe o produto, a quantidade e a forma de pagamento." });
      }

      const produto = await prisma.produto.findFirst({ where: { revendedorId: ctx.revendedorId, modelo: { equals: modelo, mode: "insensitive" } } });
      if (!produto) return JSON.stringify({ erro: `Produto "${modelo}" não encontrado no estoque.` });

      let clienteId: string | null = null;
      if (typeof dados.clienteNome === "string" && dados.clienteNome.trim()) {
        const resultadoCliente = await resolverCliente(ctx.revendedorId, dados.clienteNome.trim());
        if (!Array.isArray(resultadoCliente)) clienteId = resultadoCliente.id;
      }

      const payload: PayloadVenda = { produtoId: produto.id, quantidade, valorUnitario, formaPagamento, clienteId };
      const total = quantidade * valorUnitario;

      if (total >= LIMITE_CONFIRMACAO) {
        const resumo = `Registrar venda de ${quantidade}x ${produto.modelo} por ${brl(total)} (${formaPagamento})?`;
        return criarPendente(ctx.revendedorId, "registrar_venda", { ...payload }, resumo);
      }

      return JSON.stringify(await aplicarVenda(ctx, payload));
    }

    case "enviar_cobranca": {
      const referencia = String(dados.clienteNome ?? "").trim();
      const modeloEscolhido = String(dados.modelo ?? "Lembrete");
      if (!referencia) return JSON.stringify({ erro: "Informe o nome do cliente." });

      const resultado = await resolverCliente(ctx.revendedorId, referencia);
      if (Array.isArray(resultado)) {
        if (resultado.length === 0) return JSON.stringify({ erro: "Nenhum cliente encontrado com esse nome." });
        return JSON.stringify({ multiplosResultados: true, opcoes: resultado.map((c) => ({ id: c.id, nome: c.nome })) });
      }
      if (!resultado.whatsapp) return JSON.stringify({ erro: `${resultado.nome} não tem WhatsApp cadastrado.` });

      const [revendedor, overridesModelos] = await Promise.all([
        prisma.revendedor.findUniqueOrThrow({ where: { id: ctx.revendedorId } }),
        prisma.modeloMensagem.findMany({ where: { revendedorId: ctx.revendedorId } }),
      ]);
      const modelos = mesclarModelos(overridesModelos);
      const textoModelo = modelos[modeloEscolhido] ?? modelos.Lembrete;
      const faixa = faixaVencimento(resultado.vencimento);

      const mensagem = preencherModelo(textoModelo, {
        nome: resultado.nome,
        app: resultado.servico?.nome ?? "",
        plano: PLANO_LABEL[resultado.plano],
        vencimento: dataPorExtenso(resultado.vencimento),
        prazo: faixa === "VENCIDO" ? "vencido" : "a vencer",
        valor: brl(resultado.valorPlano),
      });

      const mensagemComLink = revendedor.mpAccessToken
        ? `${mensagem}\n\nPague direto por aqui: ${linkPagamentoCliente(resultado.id)}`
        : mensagem;

      const envio = await enviarWhatsApp(normalizarWhatsappBr(resultado.whatsapp), mensagemComLink);
      if (!envio.ok) {
        return JSON.stringify({
          erro: `Não consegui enviar pelo WhatsApp (${envio.erro}). Isso costuma acontecer quando o cliente não mandou mensagem pro número da Twilio nas últimas 24h — pode ser preciso mandar manualmente dessa vez.`,
        });
      }

      await prisma.cobranca.create({ data: { clienteId: resultado.id, modelo: modeloEscolhido } });
      await registrarLogAssessor(ctx.revendedorId, "cliente.cobranca", `Enviou cobrança (${modeloEscolhido}) para ${resultado.nome} via assessor no WhatsApp`);
      return JSON.stringify({ ok: true, enviadoPara: resultado.nome });
    }

    case "enviar_lembretes_vencimento": {
      const filtro = String(dados.filtro ?? "VENCENDO_5_DIAS");
      if (!templateLembreteConfigurado()) {
        return JSON.stringify({
          erro: "O template de lembrete de vencimento ainda não foi configurado pelo GestorPro. Avise o suporte pra habilitar essa função.",
        });
      }

      const faixaAlvo = FAIXA_POR_FILTRO[filtro] ?? "ATE_5_DIAS";
      const candidatos = await prisma.cliente.findMany({ where: { revendedorId: ctx.revendedorId, status: { not: "CANCELADO" } } });
      const alvo = candidatos.filter((c) => faixaVencimento(c.vencimento) === faixaAlvo && c.whatsapp);

      if (alvo.length === 0) {
        return JSON.stringify({ ok: true, enviados: 0, mensagem: "Nenhum cliente encontrado nesse filtro com WhatsApp cadastrado." });
      }

      if (alvo.length > LIMITE_LOTE_SEM_CONFIRMAR) {
        const nomes = alvo.slice(0, 5).map((c) => c.nome).join(", ");
        const resumo = `Mandar lembrete de vencimento pra ${alvo.length} clientes (${nomes}${alvo.length > 5 ? ", ..." : ""})?`;
        return criarPendente(ctx.revendedorId, "enviar_lembretes_vencimento", { filtro }, resumo);
      }

      return JSON.stringify(await aplicarLembretes(ctx, filtro));
    }

    case "confirmar_acao_pendente": {
      const confirmar = dados.confirmar === true;
      const pendente = await prisma.acaoPendenteAssessor.findFirst({
        where: { revendedorId: ctx.revendedorId },
        orderBy: { criadoEm: "desc" },
      });
      if (!pendente) return JSON.stringify({ erro: "Não tem nenhuma ação esperando confirmação." });

      await prisma.acaoPendenteAssessor.delete({ where: { id: pendente.id } }).catch(() => {});

      if (Date.now() - pendente.criadoEm.getTime() > PENDENTE_TTL_MS) {
        return JSON.stringify({ erro: "Essa confirmação expirou (mais de 10 minutos) — peça a ação de novo." });
      }
      if (!confirmar) return JSON.stringify({ ok: true, cancelado: true });

      const payload = pendente.payload as Record<string, unknown>;
      switch (pendente.tipo) {
        case "renovar_cliente":
          return JSON.stringify(
            await aplicarRenovacao(ctx, String(payload.clienteId), payload.plano as PlanoCliente, Number(payload.valor))
          );
        case "registrar_venda":
          return JSON.stringify(
            await aplicarVenda(ctx, {
              produtoId: String(payload.produtoId),
              quantidade: Number(payload.quantidade),
              valorUnitario: Number(payload.valorUnitario),
              formaPagamento: String(payload.formaPagamento),
              clienteId: payload.clienteId ? String(payload.clienteId) : null,
            })
          );
        case "enviar_lembretes_vencimento":
          return JSON.stringify(await aplicarLembretes(ctx, String(payload.filtro)));
        default:
          return JSON.stringify({ erro: "Tipo de ação pendente desconhecido." });
      }
    }

    default:
      return JSON.stringify({ erro: `Ferramenta desconhecida: ${nome}` });
  }
}
