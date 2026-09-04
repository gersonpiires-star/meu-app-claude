-- CreateEnum
CREATE TYPE "TipoCupom" AS ENUM ('PERCENTUAL', 'FIXO');

-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "cupomId" TEXT;

-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "canceladoEm" TIMESTAMP(3),
ADD COLUMN     "indicadoPorId" TEXT,
ADD COLUMN     "motivoCancelamento" TEXT;

-- CreateTable
CREATE TABLE "Cupom" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCupom" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "validoAte" TIMESTAMP(3),
    "usoMaximo" INTEGER,
    "usosCount" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cupom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cupom_codigo_key" ON "Cupom"("codigo");

-- AddForeignKey
ALTER TABLE "Revendedor" ADD CONSTRAINT "Revendedor_indicadoPorId_fkey" FOREIGN KEY ("indicadoPorId") REFERENCES "Revendedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_cupomId_fkey" FOREIGN KEY ("cupomId") REFERENCES "Cupom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
