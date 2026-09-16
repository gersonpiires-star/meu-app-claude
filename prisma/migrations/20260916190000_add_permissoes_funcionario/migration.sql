-- AlterTable
ALTER TABLE "Funcionario" ADD COLUMN     "podeExcluir" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "podeVerFinanceiro" BOOLEAN NOT NULL DEFAULT false;
