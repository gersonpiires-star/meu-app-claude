-- CreateIndex
CREATE INDEX "Aviso_revendedorId_idx" ON "Aviso"("revendedorId");

-- CreateIndex
CREATE INDEX "Aviso_servicoId_idx" ON "Aviso"("servicoId");

-- CreateIndex
CREATE INDEX "ChavePix_revendedorId_idx" ON "ChavePix"("revendedorId");

-- CreateIndex
CREATE INDEX "Cliente_indicadoPorId_idx" ON "Cliente"("indicadoPorId");

-- CreateIndex
CREATE INDEX "Cliente_servicoId_idx" ON "Cliente"("servicoId");

-- CreateIndex
CREATE INDEX "Cupom_revendedorId_idx" ON "Cupom"("revendedorId");

-- CreateIndex
CREATE INDEX "Funcionario_revendedorId_idx" ON "Funcionario"("revendedorId");

-- CreateIndex
CREATE INDEX "LotePlataforma_plataformaId_idx" ON "LotePlataforma"("plataformaId");

-- CreateIndex
CREATE INDEX "MovimentoEstoque_produtoId_idx" ON "MovimentoEstoque"("produtoId");

-- CreateIndex
CREATE INDEX "NotificacaoPagamento_revendedorId_idx" ON "NotificacaoPagamento"("revendedorId");

-- CreateIndex
CREATE INDEX "NotificacaoPagamento_clienteId_idx" ON "NotificacaoPagamento"("clienteId");

-- CreateIndex
CREATE INDEX "Pagamento_clienteId_idx" ON "Pagamento"("clienteId");

-- CreateIndex
CREATE INDEX "Pagamento_cupomId_idx" ON "Pagamento"("cupomId");

-- CreateIndex
CREATE INDEX "PushSubscription_revendedorId_idx" ON "PushSubscription"("revendedorId");

-- CreateIndex
CREATE INDEX "Renovacao_clienteId_idx" ON "Renovacao"("clienteId");

-- CreateIndex
CREATE INDEX "Renovacao_servicoId_idx" ON "Renovacao"("servicoId");

-- CreateIndex
CREATE INDEX "Revendedor_indicadoPorId_idx" ON "Revendedor"("indicadoPorId");

-- CreateIndex
CREATE INDEX "Servico_plataformaId_idx" ON "Servico"("plataformaId");

-- CreateIndex
CREATE INDEX "Sugestao_revendedorId_idx" ON "Sugestao"("revendedorId");

-- CreateIndex
CREATE INDEX "Venda_revendedorId_idx" ON "Venda"("revendedorId");

-- CreateIndex
CREATE INDEX "Venda_produtoId_idx" ON "Venda"("produtoId");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");
