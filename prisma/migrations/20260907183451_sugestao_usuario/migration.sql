-- CreateTable
CREATE TABLE "Sugestao" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sugestao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Sugestao" ADD CONSTRAINT "Sugestao_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
