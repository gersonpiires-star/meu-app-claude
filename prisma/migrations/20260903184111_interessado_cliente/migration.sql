-- CreateTable
CREATE TABLE "InteressadoCliente" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "interesse" TEXT,
    "retornarEm" TIMESTAMP(3),
    "observacao" TEXT,
    "convertido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteressadoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InteressadoCliente_revendedorId_convertido_idx" ON "InteressadoCliente"("revendedorId", "convertido");

-- AddForeignKey
ALTER TABLE "InteressadoCliente" ADD CONSTRAINT "InteressadoCliente_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
