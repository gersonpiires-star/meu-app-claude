-- AlterTable
ALTER TABLE "Renovacao" ADD COLUMN     "servicoId" TEXT;

-- AddForeignKey
ALTER TABLE "Renovacao" ADD CONSTRAINT "Renovacao_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
