-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN "saldoCreditos" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditoConta" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditoConta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditoConta_revendedorId_idx" ON "CreditoConta"("revendedorId");

-- AddForeignKey
ALTER TABLE "CreditoConta" ADD CONSTRAINT "CreditoConta_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
