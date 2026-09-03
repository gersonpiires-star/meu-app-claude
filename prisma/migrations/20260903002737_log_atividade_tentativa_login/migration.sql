-- CreateTable
CREATE TABLE "LogAtividade" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorTipo" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativaLogin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativaLogin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogAtividade_revendedorId_criadoEm_idx" ON "LogAtividade"("revendedorId", "criadoEm");

-- CreateIndex
CREATE INDEX "TentativaLogin_email_criadoEm_idx" ON "TentativaLogin"("email", "criadoEm");

-- AddForeignKey
ALTER TABLE "LogAtividade" ADD CONSTRAINT "LogAtividade_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
