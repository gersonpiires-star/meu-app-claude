-- AlterTable
ALTER TABLE "Renovacao" ADD COLUMN "formaPagamento" TEXT;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN "renovacaoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Venda_renovacaoId_key" ON "Venda"("renovacaoId");

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_renovacaoId_fkey" FOREIGN KEY ("renovacaoId") REFERENCES "Renovacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
