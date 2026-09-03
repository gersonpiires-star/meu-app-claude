-- CreateTable
CREATE TABLE "AvisoEnvio" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AvisoEnvio_clienteId_modelo_key" ON "AvisoEnvio"("clienteId", "modelo");

-- AddForeignKey
ALTER TABLE "AvisoEnvio" ADD CONSTRAINT "AvisoEnvio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
