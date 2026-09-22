-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "ultimoAcessoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CliqueIndicacao" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliqueIndicacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CliqueIndicacao_revendedorId_criadoEm_idx" ON "CliqueIndicacao"("revendedorId", "criadoEm");

-- AddForeignKey
ALTER TABLE "CliqueIndicacao" ADD CONSTRAINT "CliqueIndicacao_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
