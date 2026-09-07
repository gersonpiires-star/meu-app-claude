-- CreateTable
CREATE TABLE "AcaoPendenteAssessor" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "resumo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcaoPendenteAssessor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcaoPendenteAssessor_revendedorId_criadoEm_idx" ON "AcaoPendenteAssessor"("revendedorId", "criadoEm");

-- AddForeignKey
ALTER TABLE "AcaoPendenteAssessor" ADD CONSTRAINT "AcaoPendenteAssessor_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
