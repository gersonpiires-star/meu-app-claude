-- CreateTable
CREATE TABLE "ImportacaoAntiga" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "resumo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacaoAntiga_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportacaoAntiga_revendedorId_hash_key" ON "ImportacaoAntiga"("revendedorId", "hash");

-- AddForeignKey
ALTER TABLE "ImportacaoAntiga" ADD CONSTRAINT "ImportacaoAntiga_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
