-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "assessorAtivo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConversaAssessor" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversaAssessor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversaAssessor_revendedorId_criadoEm_idx" ON "ConversaAssessor"("revendedorId", "criadoEm");

-- AddForeignKey
ALTER TABLE "ConversaAssessor" ADD CONSTRAINT "ConversaAssessor_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
