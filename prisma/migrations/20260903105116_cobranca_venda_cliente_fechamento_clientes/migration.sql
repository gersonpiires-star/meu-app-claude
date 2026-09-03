-- AlterTable
ALTER TABLE "FechamentoMes" ADD COLUMN     "clientesAtivos" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "clienteId" TEXT;

-- CreateTable
CREATE TABLE "Cobranca" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cobranca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cobranca_clienteId_criadoEm_idx" ON "Cobranca"("clienteId", "criadoEm");

-- AddForeignKey
ALTER TABLE "Cobranca" ADD CONSTRAINT "Cobranca_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
