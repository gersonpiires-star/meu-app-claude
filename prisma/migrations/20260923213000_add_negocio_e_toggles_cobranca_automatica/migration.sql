-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN "nomeNegocio" TEXT;
ALTER TABLE "Revendedor" ADD COLUMN "cidade" TEXT;
ALTER TABLE "Revendedor" ADD COLUMN "lembreteAntesAtivo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Revendedor" ADD COLUMN "avisoVencimentoAtivo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Revendedor" ADD COLUMN "cobrancaAposVencerAtiva" BOOLEAN NOT NULL DEFAULT false;
