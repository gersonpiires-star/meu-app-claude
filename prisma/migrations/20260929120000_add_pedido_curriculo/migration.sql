-- CreateTable
CREATE TABLE "PedidoCurriculo" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoCurriculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCurriculo_token_key" ON "PedidoCurriculo"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCurriculo_mpPreferenceId_key" ON "PedidoCurriculo"("mpPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCurriculo_mpPaymentId_key" ON "PedidoCurriculo"("mpPaymentId");

-- CreateIndex
CREATE INDEX "PedidoCurriculo_status_criadoEm_idx" ON "PedidoCurriculo"("status", "criadoEm");
