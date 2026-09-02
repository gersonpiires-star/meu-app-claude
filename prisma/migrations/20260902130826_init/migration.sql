-- CreateTable
CREATE TABLE "Revendedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'REVENDEDOR',
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusAssinatura" TEXT NOT NULL DEFAULT 'TRIAL',
    "planoAssinatura" TEXT,
    "trialFim" DATETIME NOT NULL,
    "assinaturaVence" DATETIME
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Servico_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT NOT NULL,
    "servicoId" TEXT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "whatsapp" TEXT,
    "telas" INTEGER NOT NULL DEFAULT 1,
    "plano" TEXT NOT NULL,
    "valorPlano" REAL NOT NULL,
    "vencimento" DATETIME NOT NULL,
    "testeGratis" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "anotacao" TEXT,
    "motivoSaida" TEXT,
    "motivoSaidaData" DATETIME,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Cliente_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Cliente_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Renovacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "custo" REAL NOT NULL DEFAULT 0,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Renovacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Produto_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produtoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custoUnitario" REAL NOT NULL,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovimentoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" REAL NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "taxaPercentual" REAL NOT NULL DEFAULT 0,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venda_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Venda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recarga" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorPago" REAL NOT NULL,
    "utilizadas" INTEGER NOT NULL DEFAULT 0,
    "data" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recarga_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recarga_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT,
    "servicoId" TEXT,
    "destino" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Aviso_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Aviso_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Interessado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "interesse" TEXT,
    "retornarEm" DATETIME,
    "observacao" TEXT,
    "convertido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FechamentoMes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "revendedorId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "receita" REAL NOT NULL,
    "custo" REAL NOT NULL,
    "lucro" REAL NOT NULL,
    "fechadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FechamentoMes_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Revendedor_email_key" ON "Revendedor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_revendedorId_nome_key" ON "Servico"("revendedorId", "nome");

-- CreateIndex
CREATE INDEX "Cliente_revendedorId_status_idx" ON "Cliente"("revendedorId", "status");

-- CreateIndex
CREATE INDEX "Cliente_revendedorId_vencimento_idx" ON "Cliente"("revendedorId", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_revendedorId_modelo_key" ON "Produto"("revendedorId", "modelo");

-- CreateIndex
CREATE UNIQUE INDEX "FechamentoMes_revendedorId_ano_mes_key" ON "FechamentoMes"("revendedorId", "ano", "mes");
