-- AlterTable
ALTER TABLE "Pagamento" ADD COLUMN     "valorLiquido" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Revendedor" ADD COLUMN     "taxasCartaoPersonalizadas" JSONB;

-- Preenche o valor líquido dos pagamentos de assinatura já aprovados antes
-- dessa coluna existir, pra não zerar a receita histórica do admin — assume
-- que nenhuma taxa foi descontada desses (é a mesma coisa que já era
-- exibida antes desse ajuste).
UPDATE "Pagamento" SET "valorLiquido" = "valor" WHERE "status" = 'APROVADO' AND "valorLiquido" IS NULL;
