-- AlterTable
ALTER TABLE "Renovacao" ADD COLUMN     "servicoId" TEXT;

-- AddForeignKey
ALTER TABLE "Renovacao" ADD CONSTRAINT "Renovacao_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: renovações lançadas antes desse campo existir não têm como
-- saber qual app o cliente usava no momento exato de cada uma — a melhor
-- aproximação possível é o app que o cliente tem cadastrado hoje. Daqui pra
-- frente, toda renovação nova já grava o app certo no momento em que
-- acontece (ver Renovacao.servicoId no schema).
UPDATE "Renovacao" r
SET "servicoId" = c."servicoId"
FROM "Cliente" c
WHERE r."clienteId" = c.id AND r."servicoId" IS NULL AND c."servicoId" IS NOT NULL;
