/*
  Warnings:

  - You are about to drop the `Recarga` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Recarga" DROP CONSTRAINT "Recarga_revendedorId_fkey";

-- DropForeignKey
ALTER TABLE "Recarga" DROP CONSTRAINT "Recarga_servicoId_fkey";

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "diaFixo" INTEGER;

-- AlterTable
ALTER TABLE "Servico" ADD COLUMN     "cobrancaTelaExtra" DOUBLE PRECISION,
ADD COLUMN     "custoCredito" DOUBLE PRECISION,
ADD COLUMN     "plataformaId" TEXT;

-- DropTable
DROP TABLE "Recarga";

-- CreateTable
CREATE TABLE "Plataforma" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "minimo" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotePlataforma" (
    "id" TEXT NOT NULL,
    "plataformaId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorPago" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotePlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChavePix" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChavePix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloMensagem" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "texto" TEXT NOT NULL,

    CONSTRAINT "ModeloMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plataforma_revendedorId_nome_key" ON "Plataforma"("revendedorId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "ModeloMensagem_revendedorId_chave_key" ON "ModeloMensagem"("revendedorId", "chave");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "Plataforma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plataforma" ADD CONSTRAINT "Plataforma_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotePlataforma" ADD CONSTRAINT "LotePlataforma_plataformaId_fkey" FOREIGN KEY ("plataformaId") REFERENCES "Plataforma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChavePix" ADD CONSTRAINT "ChavePix_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloMensagem" ADD CONSTRAINT "ModeloMensagem_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
