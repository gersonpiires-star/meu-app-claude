import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const emailAdmin = process.env.SEED_ADMIN_EMAIL ?? "admin@gestorpro.app";
  const senhaAdmin = process.env.SEED_ADMIN_SENHA ?? "trocar123";

  const trialFim = new Date();
  trialFim.setDate(trialFim.getDate() + 3650);

  await prisma.revendedor.upsert({
    where: { email: emailAdmin },
    update: {},
    create: {
      nome: "Administrador GestorPro",
      whatsapp: "5500000000000",
      email: emailAdmin,
      senhaHash: await bcrypt.hash(senhaAdmin, 10),
      papel: "ADMIN",
      statusAssinatura: "ATIVO",
      trialFim,
    },
  });

  console.log(`Admin pronto: ${emailAdmin} / ${senhaAdmin}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
