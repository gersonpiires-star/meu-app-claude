-- CreateTable
CREATE TABLE "NotificacaoPagamento" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "clienteId" TEXT,
    "clienteNome" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacaoPagamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotificacaoPagamento" ADD CONSTRAINT "NotificacaoPagamento_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacaoPagamento" ADD CONSTRAINT "NotificacaoPagamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
