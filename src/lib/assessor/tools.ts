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
import { enviarWhatsApp } from "@/lib/twilio";

// Toda ferramenta recebe o revendedorId de quem mandou a mensagem no
// WhatsApp (já resolvido pelo webhook a partir do número remetente) —
// nunca confia em nenhum id de revendedor que o modelo possa inventar,
// exatamente como as Server Actions nunca confiam em id vindo do form.
type Ctx = { revendedorId: string };

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
    description: "Renova o plano de um cliente já existente, estendendo o vencimento a partir de hoje (ou do vencimento atual, se ainda não venceu).",
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
    description: "Registra a venda de um produto (aparelho) em estoque, opcionalmente vinculada a um cliente.",
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
      const base = resultado.vencimento > new Date() ? resultado.vencimento : new Date();
      const novoVencimento = calcularVencimentoComDiaFixo(plano, base, resultado.diaFixo);

      await prisma.$transaction([
        prisma.renovacao.create({ data: { clienteId: resultado.id, plano, valor, custo: 0 } }),
        prisma.cliente.update({
          where: { id: resultado.id },
          data: { plano, valorPlano: valor, vencimento: novoVencimento, status: "ATIVO", testeGratis: false },
        }),
      ]);

      await registrarLogAssessor(
        ctx.revendedorId,
        "cliente.renovar",
        `Renovou o plano de ${resultado.nome} (${PLANO_LABEL[plano]}, ${brl(valor)}) via assessor no WhatsApp`
      );
      return JSON.stringify({ ok: true, cliente: resultado.nome, novoVencimento: dataCurta(novoVencimento) });
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

      try {
        await prisma.$transaction(
          async (tx) => {
            const estoque = await estoqueAtualProduto(produto.id, tx);
            if (quantidade > estoque) {
              throw new Error(
                estoque > 0
                  ? `Estoque insuficiente — só há ${estoque} unidade(s) de ${produto.modelo}.`
                  : `Sem estoque de ${produto.modelo}.`
              );
            }
            const { custoUnitario } = await custoConsumoFifo(produto.id, quantidade, tx);
            await tx.venda.create({
              data: {
                revendedorId: ctx.revendedorId,
                produtoId: produto.id,
                clienteId,
                quantidade,
                valorUnitario,
                custoUnitario,
                formaPagamento,
              },
            });
            await tx.movimentoEstoque.create({
              data: { produtoId: produto.id, tipo: "SAIDA", quantidade, custoUnitario },
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );
      } catch (erro) {
        return JSON.stringify({ erro: erro instanceof Error ? erro.message : "Falha ao registrar a venda." });
      }

      await registrarLogAssessor(ctx.revendedorId, "venda.criar", `Registrou venda de ${quantidade}x ${produto.modelo} via assessor no WhatsApp`);
      return JSON.stringify({ ok: true, produto: produto.modelo, quantidade, total: brl(quantidade * valorUnitario) });
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

    default:
      return JSON.stringify({ erro: `Ferramenta desconhecida: ${nome}` });
  }
}
