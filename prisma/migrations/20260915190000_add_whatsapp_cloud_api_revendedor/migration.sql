-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "whatsappBotAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappConectadoEm" TIMESTAMP(3),
ADD COLUMN     "whatsappTelefoneNumeroId" TEXT,
ADD COLUMN     "whatsappTokenCriptografado" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Revendedor_whatsappTelefoneNumeroId_key" ON "Revendedor"("whatsappTelefoneNumeroId");

