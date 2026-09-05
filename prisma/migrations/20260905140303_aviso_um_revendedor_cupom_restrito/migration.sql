-- AlterEnum
ALTER TYPE "DestinoAviso" ADD VALUE 'UM_REVENDEDOR';

-- AlterTable
ALTER TABLE "Cupom" ADD COLUMN     "revendedorId" TEXT;

-- AddForeignKey
ALTER TABLE "Cupom" ADD CONSTRAINT "Cupom_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
