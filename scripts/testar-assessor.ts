import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { responderMensagemAssessor } from "@/lib/assessor";

// Conversa com o assessor de IA direto no terminal, sem precisar de
// WhatsApp/Twilio — útil pra testar o comportamento e as ferramentas
// localmente. Cria (uma vez só) um revendedor e alguns clientes fictícios
// pra ter dados reais pra consultar. Rodar com `npm run assessor:testar`.
const EMAIL_TESTE = "assessor-teste@gestorpro.local";

async function garantirDadosDeTeste() {
  const trialFim = new Date();
  trialFim.setDate(trialFim.getDate() + 3650);

  const revendedor = await prisma.revendedor.upsert({
    where: { email: EMAIL_TESTE },
    update: { assessorAtivo: true },
    create: {
      nome: "Revendedor de Teste",
      whatsapp: "5511999999999",
      email: EMAIL_TESTE,
      senhaHash: await bcrypt.hash("teste12345", 10),
      statusAssinatura: "ATIVO",
      trialFim,
      assessorAtivo: true,
    },
  });

  const totalClientes = await prisma.cliente.count({ where: { revendedorId: revendedor.id } });
  if (totalClientes === 0) {
    const netflix = await prisma.servico.create({ data: { revendedorId: revendedor.id, nome: "Netflix" } });
    const primeVideo = await prisma.servico.create({ data: { revendedorId: revendedor.id, nome: "Prime Video" } });

    const hoje = Date.now();
    const dias = (n: number) => new Date(hoje + n * 86_400_000);

    await prisma.cliente.createMany({
      data: [
        {
          revendedorId: revendedor.id,
          servicoId: netflix.id,
          nome: "Marcos Silva",
          whatsapp: "5511988887777",
          plano: "MENSAL",
          valorPlano: 45,
          vencimento: dias(2),
          status: "ATIVO",
        },
        {
          revendedorId: revendedor.id,
          servicoId: primeVideo.id,
          nome: "Ana Paula",
          whatsapp: "5511977776666",
          plano: "TRIMESTRAL",
          valorPlano: 70,
          vencimento: dias(-3),
          status: "ATIVO",
        },
        {
          revendedorId: revendedor.id,
          servicoId: netflix.id,
          nome: "Beatriz Lima",
          plano: "MENSAL",
          valorPlano: 35,
          vencimento: dias(20),
          status: "ATIVO",
        },
      ],
    });

    const produto = await prisma.produto.create({ data: { revendedorId: revendedor.id, modelo: "TV Box X96" } });
    await prisma.movimentoEstoque.create({ data: { produtoId: produto.id, tipo: "ENTRADA", quantidade: 10, custoUnitario: 80 } });

    console.log("Dados de teste criados: 3 clientes (1 vencendo em 2 dias, 1 vencido há 3 dias, 1 em dia) + 1 produto em estoque.\n");
  }

  return revendedor;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Defina ANTHROPIC_API_KEY no ambiente (.env ou export) antes de rodar esse script.");
    process.exit(1);
  }

  const revendedor = await garantirDadosDeTeste();
  console.log(`Conversando como "${revendedor.nome}". Digite sua mensagem (ou "sair" pra encerrar).\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "você> " });
  rl.prompt();

  rl.on("line", async (linha) => {
    const texto = linha.trim();
    if (!texto) return rl.prompt();
    if (["sair", "exit", "quit"].includes(texto.toLowerCase())) {
      rl.close();
      return;
    }

    try {
      const resposta = await responderMensagemAssessor(revendedor.id, revendedor.nome, texto);
      console.log(`\nassessor> ${resposta}\n`);
    } catch (erro) {
      console.error("\nErro ao chamar o assessor:", erro, "\n");
    }
    rl.prompt();
  });

  rl.on("close", async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

main();
