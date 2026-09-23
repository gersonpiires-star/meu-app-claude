import type { ReactNode } from "react";
import Link from "next/link";
import { exigirRevendedor, souFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, cx, Field, Input } from "@/components/ui";
import { salvarCredenciaisAsaas, salvarCredenciaisMP, salvarGatewayPagamento, salvarSuspensaoAutomatica } from "./actions";
import { PerfilForm } from "./perfil-form";
import { ImportarForm } from "./importar-form";
import { ChavesPixForm } from "./chaves-pix-form";
import { BackupForm } from "./backup-form";
import { NotificacoesPush } from "./notificacoes-push";
import { LinkIndicacao } from "./link-indicacao";
import { CancelarAssinaturaForm } from "./cancelar-assinatura-form";
import { SugestaoForm } from "./sugestao-form";
import { funilIndicacao } from "@/lib/indicacao";
import { UnitvForm } from "./unitv-form";
import { ThemeToggle } from "@/components/theme-toggle";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Integração UniTV ainda é um teste não verificado (ver
// src/lib/integracoes/unitv.ts) — só aparece pro dono do GestorPro por
// enquanto, a pedido dele, até ficar confiável o suficiente pra outros
// revendedores verem.
const EMAIL_BETA_UNITV = "gersonpiires@gmail.com";

// Pausado a pedido do dono enquanto se espera a resposta da UniTV sobre uma
// API oficial — o card fica escondido (mas o código continua todo aqui) até
// virar true de novo.
const INTEGRACAO_UNITV_ATIVA = false;

// Título simples de item dentro de uma categoria — sem acordeão: como só
// uma categoria fica visível por vez (igual GitHub/Linear/Stripe), não
// precisa mais recolher cada item pra caber na tela.
function Item({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <h3 className="text-sm font-bold text-text">{titulo}</h3>
        {extra}
      </div>
      {children}
    </Card>
  );
}

function ItemLink({ titulo, descricao, href, label = "Abrir" }: { titulo: string; descricao: string; href: string; label?: string }) {
  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-text">{titulo}</h3>
        <p className="text-sm text-text-dim">{descricao}</p>
      </div>
      <Link href={href} className="shrink-0">
        <Button variant="ghost">{label}</Button>
      </Link>
    </Card>
  );
}

type CategoriaKey = "conta" | "pagamentos" | "atendimento" | "ferramentas" | "equipe" | "dados" | "suporte";

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const revendedor = await exigirRevendedor();
  const ehFuncionario = await souFuncionario();
  const podeVerBetaUnitv = INTEGRACAO_UNITV_ATIVA && revendedor.email === EMAIL_BETA_UNITV;
  const configurado = Boolean(revendedor.mpAccessToken);
  const configuradoAsaas = Boolean(revendedor.asaasApiKey);
  const gatewayAtivo = revendedor.gatewayPagamento;
  const [chaves, funilIndicacaoRevendedor] = await Promise.all([
    prisma.chavePix.findMany({ where: { revendedorId: revendedor.id }, orderBy: { criadoEm: "desc" } }),
    funilIndicacao(revendedor.id),
  ]);

  const categorias: { key: CategoriaKey; label: string; visivel: boolean }[] = [
    { key: "conta", label: "Conta", visivel: !ehFuncionario },
    { key: "pagamentos", label: "Pagamentos", visivel: true },
    { key: "atendimento", label: "Atendimento", visivel: true },
    { key: "ferramentas", label: "Ferramentas", visivel: true },
    { key: "equipe", label: "Equipe", visivel: !ehFuncionario },
    { key: "dados", label: "Dados", visivel: true },
    { key: "suporte", label: "Suporte", visivel: true },
  ];
  const categoriasVisiveis = categorias.filter((c) => c.visivel);

  const { cat } = await searchParams;
  const catAtiva: CategoriaKey = categoriasVisiveis.find((c) => c.key === cat)?.key ?? categoriasVisiveis[0].key;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Configurações</h1>

      {/* Mobile: abas horizontais roláveis. Desktop: sub-menu vertical fixo
          ao lado do conteúdo (mesmo padrão de Stripe/Linear/GitHub — uma
          categoria por vez, sem empilhar tudo numa rolagem só). */}
      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        {categoriasVisiveis.map((c) => (
          <Link
            key={c.key}
            href={`/configuracoes?cat=${c.key}`}
            className={cx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              c.key === catAtiva ? "bg-accent text-bg" : "bg-surface-2 text-text-muted"
            )}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
        <nav className="hidden w-44 shrink-0 flex-col gap-1 md:flex">
          {categoriasVisiveis.map((c) => (
            <Link
              key={c.key}
              href={`/configuracoes?cat=${c.key}`}
              className={cx(
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                c.key === catAtiva ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {catAtiva === "conta" ? (
            <>
              <Item titulo="Seus dados">
                <PerfilForm nome={revendedor.nome} whatsapp={revendedor.whatsapp} />
              </Item>

              <Item titulo="Aparência">
                <p className="mb-3 text-sm text-text-dim">
                  O escuro é o padrão; o claro ajuda em ambientes iluminados. &quot;Automático&quot; segue o tema do
                  seu sistema.
                </p>
                <ThemeToggle />
              </Item>

              <Item titulo="Indique o GestorPro">
                <p className="mb-3 text-sm text-text-dim">
                  Compartilhe seu link — quando a pessoa se cadastrar por ele e assinar o primeiro plano pago,
                  você ganha automaticamente um cupom de 15% de desconto pra usar na sua próxima renovação.
                </p>
                <LinkIndicacao link={`${baseUrl()}/cadastro?ref=${revendedor.id}`} />
                {funilIndicacaoRevendedor.cliques > 0 ? (
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-text">{funilIndicacaoRevendedor.cliques}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Cliques no link</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-text">{funilIndicacaoRevendedor.cadastros}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">Se cadastraram</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-accent">{funilIndicacaoRevendedor.assinantes}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Assinaram</p>
                    </div>
                  </div>
                ) : null}
              </Item>

              <Item titulo="Cancelar assinatura">
                <p className="mb-3 text-sm text-text-dim">Se decidir sair, seus dados continuam guardados.</p>
                <CancelarAssinaturaForm />
              </Item>
            </>
          ) : null}

          {catAtiva === "pagamentos" ? (
            <>
              {ehFuncionario ? null : (
                <Item
                  titulo="Receber pagamentos online (Mercado Pago)"
                  extra={
                    <div className="flex items-center gap-1.5">
                      {gatewayAtivo === "MERCADOPAGO" ? <Badge tone="success">Ativo pra cobrar</Badge> : null}
                      {configurado ? <Badge tone="accent">Configurado</Badge> : <Badge tone="neutral">Não configurado</Badge>}
                    </div>
                  }
                >
                  <p className="mb-4 text-sm text-text-dim">
                    Cole aqui o Access Token da sua própria conta do Mercado Pago para gerar links de pagamento
                    (Pix, cartão) na cobrança dos seus clientes — o dinheiro cai direto na sua conta, o GestorPro
                    não fica no meio. Pegue suas credenciais de produção em
                    mercadopago.com.br/developers/panel/app, na seção &quot;Credenciais de produção&quot;.
                  </p>
                  <form action={salvarCredenciaisMP} className="flex flex-col gap-3">
                    <Field label="Access Token">
                      <Input
                        type="password"
                        name="mpAccessToken"
                        placeholder={configurado ? "•••••••••••• (colar novo para trocar)" : "APP_USR-..."}
                        autoComplete="off"
                      />
                    </Field>
                    <Field label="Public Key (opcional)">
                      <Input
                        name="mpPublicKey"
                        defaultValue={revendedor.mpPublicKey ?? ""}
                        placeholder="APP_USR-..."
                        autoComplete="off"
                      />
                    </Field>
                    <Button type="submit" className="mt-1 w-full">
                      Salvar credenciais
                    </Button>
                  </form>
                  {configurado && gatewayAtivo !== "MERCADOPAGO" ? (
                    <form action={salvarGatewayPagamento} className="mt-2">
                      <input type="hidden" name="gatewayPagamento" value="MERCADOPAGO" />
                      <Button type="submit" variant="ghost" className="w-full">
                        Usar Mercado Pago pra cobrar renovações
                      </Button>
                    </form>
                  ) : null}
                </Item>
              )}

              {ehFuncionario ? null : (
                <Item
                  titulo="Receber pagamentos online (Asaas)"
                  extra={
                    <div className="flex items-center gap-1.5">
                      {gatewayAtivo === "ASAAS" ? <Badge tone="success">Ativo pra cobrar</Badge> : null}
                      {configuradoAsaas ? <Badge tone="accent">Configurado</Badge> : <Badge tone="neutral">Não configurado</Badge>}
                    </div>
                  }
                >
                  <p className="mb-4 text-sm text-text-dim">
                    Alternativa ao Mercado Pago — cole aqui a API Key da sua conta do Asaas pra gerar links de
                    pagamento (Pix, boleto, cartão) na cobrança dos seus clientes; o dinheiro cai direto na sua
                    conta. Pegue sua chave em asaas.com, em Integrações → API. Exige que o cliente tenha CPF ou
                    CNPJ cadastrado — sem isso a cobrança não é gerada.
                  </p>
                  <form action={salvarCredenciaisAsaas} className="flex flex-col gap-3">
                    <Field label="API Key">
                      <Input
                        type="password"
                        name="asaasApiKey"
                        placeholder={configuradoAsaas ? "•••••••••••• (colar nova para trocar)" : "$aact_..."}
                        autoComplete="off"
                      />
                    </Field>
                    <Button type="submit" className="mt-1 w-full">
                      Salvar credencial
                    </Button>
                  </form>
                  {configuradoAsaas && gatewayAtivo !== "ASAAS" ? (
                    <form action={salvarGatewayPagamento} className="mt-2">
                      <input type="hidden" name="gatewayPagamento" value="ASAAS" />
                      <Button type="submit" variant="ghost" className="w-full">
                        Usar Asaas pra cobrar renovações
                      </Button>
                    </form>
                  ) : null}
                </Item>
              )}

              {ehFuncionario ? null : (
                <Item titulo="Chaves Pix">
                  <p className="mb-3 text-sm text-text-dim">
                    Cadastre suas chaves pra anexar na mensagem de cobrança que vai pro cliente.
                  </p>
                  <ChavesPixForm chaves={chaves} />
                </Item>
              )}

              <Item titulo="Suspensão automática">
                <p className="mb-3 text-sm text-text-dim">
                  Cancela sozinho o cliente que ficar vencido por mais do que esse número de dias. Deixe em
                  branco para nunca cancelar automaticamente.
                </p>
                <form action={salvarSuspensaoAutomatica} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Field label="Dias de tolerância após o vencimento">
                      <Input
                        type="number"
                        name="diasParaCancelarAutomatico"
                        min={1}
                        placeholder="Ex: 10"
                        defaultValue={revendedor.diasParaCancelarAutomatico ?? ""}
                      />
                    </Field>
                  </div>
                  <Button type="submit">Salvar</Button>
                </form>
              </Item>
            </>
          ) : null}

          {catAtiva === "atendimento" ? (
            <>
              <ItemLink
                titulo="Modelos de mensagem"
                descricao="Personalize os textos de cobrança e comunicado."
                href="/configuracoes/modelos"
                label="Editar"
              />

              <Item titulo="Lembrete diário de vencimento">
                <p className="mb-3 text-sm text-text-dim">
                  Receba uma notificação toda manhã no celular ou computador com quem está vencendo ou vencido —
                  sem precisar abrir o app pra conferir.
                </p>
                <NotificacoesPush />
              </Item>
            </>
          ) : null}

          {catAtiva === "ferramentas" ? (
            <>
              <ItemLink titulo="Precificação" descricao="Calculadora de preço e maquininha." href="/precificacao" />
              <ItemLink
                titulo="Plataformas de crédito"
                descricao="Fornecedores, lotes de compra e saldo."
                href="/plataformas"
              />
              {ehFuncionario || !podeVerBetaUnitv ? null : (
                <Item titulo="Integração UniTV" extra={<Badge tone="warning">Beta</Badge>}>
                  <p className="mb-3 text-sm text-text-dim">
                    Conecte sua conta de revenda da UniTV pra, no futuro, renovar clientes direto pelo GestorPro
                    sem abrir o painel deles. A UniTV não tem API oficial — essa integração é experimental e pode
                    falhar ou parar de funcionar sem aviso.
                  </p>
                  <UnitvForm usuarioAtual={revendedor.unitvUsuario} conectadoEm={revendedor.unitvConectadoEm} />
                </Item>
              )}
            </>
          ) : null}

          {catAtiva === "equipe" && !ehFuncionario ? (
            <>
              <ItemLink
                titulo="Funcionários"
                descricao="Dê acesso ao app pra quem te ajuda a atender."
                href="/configuracoes/funcionarios"
                label="Gerenciar"
              />
              <ItemLink
                titulo="Histórico de ações"
                descricao="Veja o que você e seus funcionários andaram fazendo."
                href="/configuracoes/historico"
                label="Ver histórico"
              />
            </>
          ) : null}

          {catAtiva === "dados" ? (
            <>
              <Item titulo="Backup em arquivo">
                <p className="mb-3 text-sm text-text-dim">
                  Cópia congelada dos seus dados — a nuvem não guarda histórico de versões antigas.
                </p>
                <BackupForm podeRestaurar={!ehFuncionario} podeExportar={!ehFuncionario} />
              </Item>

              {ehFuncionario ? null : (
                <Item titulo="Trazer dados de outro sistema">
                  <ImportarForm podeZerar={!ehFuncionario} />
                </Item>
              )}
            </>
          ) : null}

          {catAtiva === "suporte" ? (
            <>
              <ItemLink
                titulo="Central de ajuda"
                descricao="Respostas rápidas pras dúvidas mais comuns sobre o app."
                href="/ajuda"
              />
              <Item titulo="Sugestões pro time do GestorPro">
                <p className="mb-3 text-sm text-text-dim">
                  Tem alguma dica de melhoria ou ajuste que faria diferença no seu dia a dia? Conta pra gente.
                </p>
                <SugestaoForm />
              </Item>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
