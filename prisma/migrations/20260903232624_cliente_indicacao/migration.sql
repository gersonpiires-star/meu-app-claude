-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "indicadoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_indicadoPorId_fkey" FOREIGN KEY ("indicadoPorId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
