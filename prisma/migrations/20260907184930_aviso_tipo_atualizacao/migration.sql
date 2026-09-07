-- CreateEnum
CREATE TYPE "TipoAviso" AS ENUM ('GERAL', 'ATUALIZACAO');

-- AlterTable
ALTER TABLE "Aviso" ADD COLUMN     "tipo" "TipoAviso" NOT NULL DEFAULT 'GERAL';
