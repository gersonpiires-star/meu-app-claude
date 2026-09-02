-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'REVENDEDOR');

-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVO', 'PAUSADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PlanoAssinatura" AS ENUM ('MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "PlanoCliente" AS ENUM ('MENSAL', 'DOIS_MESES', 'TRIMESTRAL', 'SEMESTRAL');

-- CreateEnum
CREATE TYPE "StatusCliente" AS ENUM ('TESTE', 'ATIVO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoMovimentoEstoque" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "DestinoAviso" AS ENUM ('TODOS_REVENDEDORES', 'TODOS_CLIENTES', 'CLIENTES_DO_SERVICO');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('ASSINATURA', 'RENOVACAO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Revendedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'REVENDEDOR',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusAssinatura" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
    "planoAssinatura" "PlanoAssinatura",
    "trialFim" TIMESTAMP(3) NOT NULL,
    "assinaturaVence" TIMESTAMP(3),
    "mpAccessToken" TEXT,
    "mpPublicKey" TEXT,

    CONSTRAINT "Revendedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "servicoId" TEXT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "whatsapp" TEXT,
    "telas" INTEGER NOT NULL DEFAULT 1,
    "plano" "PlanoCliente" NOT NULL,
    "valorPlano" DOUBLE PRECISION NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "testeGratis" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusCliente" NOT NULL DEFAULT 'ATIVO',
    "anotacao" TEXT,
    "motivoSaida" TEXT,
    "motivoSaidaData" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Renovacao" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "plano" "PlanoCliente" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Renovacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoEstoque" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tipo" "TipoMovimentoEstoque" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "custoUnitario" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorUnitario" DOUBLE PRECISION NOT NULL,
    "formaPagamento" TEXT NOT NULL,
    "taxaPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recarga" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valorPago" DOUBLE PRECISION NOT NULL,
    "utilizadas" INTEGER NOT NULL DEFAULT 0,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT,
    "servicoId" TEXT,
    "destino" "DestinoAviso" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interessado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "interesse" TEXT,
    "retornarEm" TIMESTAMP(3),
    "observacao" TEXT,
    "convertido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interessado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FechamentoMes" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "receita" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL,
    "lucro" DOUBLE PRECISION NOT NULL,
    "fechadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FechamentoMes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "id" TEXT NOT NULL,
    "revendedorId" TEXT NOT NULL,
    "clienteId" TEXT,
    "tipo" "TipoPagamento" NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "plano" "PlanoCliente",
    "valor" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "meses" INTEGER,
    "mpPreferenceId" TEXT,
    "mpPaymentId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pagamento_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_mpPreferenceId_key" ON "Pagamento"("mpPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_mpPaymentId_key" ON "Pagamento"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Pagamento_revendedorId_status_idx" ON "Pagamento"("revendedorId", "status");

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Renovacao" ADD CONSTRAINT "Renovacao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEstoque" ADD CONSTRAINT "MovimentoEstoque_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recarga" ADD CONSTRAINT "Recarga_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recarga" ADD CONSTRAINT "Recarga_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FechamentoMes" ADD CONSTRAINT "FechamentoMes_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_revendedorId_fkey" FOREIGN KEY ("revendedorId") REFERENCES "Revendedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pagamento" ADD CONSTRAINT "Pagamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
