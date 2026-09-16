
-- CreateTable
CREATE TABLE "LimiteRequisicao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LimiteRequisicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LimiteRequisicao_chave_criadoEm_idx" ON "LimiteRequisicao"("chave", "criadoEm");

