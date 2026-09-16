-- CreateEnum
CREATE TYPE "GatewayPagamento" AS ENUM ('MERCADOPAGO', 'ASAAS');

-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "asaasApiKey" TEXT,
ADD COLUMN     "gatewayPagamento" "GatewayPagamento" NOT NULL DEFAULT 'MERCADOPAGO';

-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "asaasPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_asaasPaymentId_key" ON "Pagamento"("asaasPaymentId");
