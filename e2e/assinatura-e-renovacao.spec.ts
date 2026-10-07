import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

// Cobre dois fluxos financeiros críticos que NÃO passam pelo webhook de
// gateway (Mercado Pago/Asaas sempre revalida o pagamento direto na API
// deles antes de aplicar qualquer efeito — não dá pra simular isso num E2E
// sem credenciais de sandbox reais): renovação manual de cliente (mesmo
// efeito de negócio de uma renovação paga — estende o vencimento — só que
// disparada pelo revendedor) e cancelamento da própria assinatura.
test.describe.configure({ mode: "serial" });

const agora = Date.now();
const EMAIL = `e2e-assinatura-${agora}@example.com`;
const SENHA = "senha123456";
const NOME_CLIENTE = `Cliente Renovacao E2E ${agora}`;

async function login(page: Page) {
  await page.goto("/entrar");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail").fill(EMAIL);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}

test.afterAll(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('DELETE FROM "Revendedor" WHERE email = $1', [EMAIL]);
  await client.end();
});

test("cadastro + renovação manual estende o vencimento do cliente", async ({ page }) => {
  await page.goto("/cadastro");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nome completo").fill("Teste Assinatura E2E");
  await page.getByLabel("WhatsApp").fill("11999997777");
  await page.getByLabel("E-mail", { exact: true }).fill(EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha").fill(SENHA);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel$/);

  await page.goto("/clientes/novo");
  await page.waitForLoadState("networkidle");
  await page.locator('input[name="nome"]').fill(NOME_CLIENTE);
  await page.getByRole("button", { name: "Salvar cliente" }).click();
  // "novo" também dá match em /[a-zA-Z0-9]+$/ (é só letras) — esperar o
  // heading com o nome do cliente é o sinal real de que já redirecionou
  // pra /clientes/[id] depois do create, não só a URL com regex frouxa.
  await expect(page.getByRole("heading", { name: NOME_CLIENTE })).toBeVisible({ timeout: 15000 });

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const match = await db.query('SELECT id, vencimento FROM "Cliente" WHERE nome = $1', [NOME_CLIENTE]);
  const clienteId = match.rows[0].id;
  const vencimentoAntes = new Date(match.rows[0].vencimento);

  await page.getByRole("button", { name: "Renovar", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar renovação" }).click();
  // RenovarForm fecha o próprio formulário (setAberto(false)) só depois da
  // Server Action resolver — esperar o botão "Renovar" reaparecer é o
  // sinal de que a renovação já foi processada no servidor.
  await expect(page.getByRole("button", { name: "Renovar", exact: true })).toBeVisible({ timeout: 15000 });

  const depois = await db.query('SELECT vencimento FROM "Cliente" WHERE id = $1', [clienteId]);
  const vencimentoDepois = new Date(depois.rows[0].vencimento);
  expect(vencimentoDepois.getTime()).toBeGreaterThan(vencimentoAntes.getTime());

  const renovacoes = await db.query('SELECT count(*) FROM "Renovacao" WHERE "clienteId" = $1', [clienteId]);
  expect(Number(renovacoes.rows[0].count)).toBeGreaterThanOrEqual(1);

  await db.end();
});

test("cancelar assinatura marca a conta como CANCELADO", async ({ page }) => {
  await login(page);

  await page.goto("/configuracoes?cat=conta");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Cancelar minha assinatura" }).click();

  // O form usa window.confirm antes de submeter — sem aceitar o diálogo o
  // clique no botão de dentro do form nunca dispara a Server Action.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel(/Por que está cancelando/).fill("Teste automatizado E2E");
  await page.getByRole("button", { name: "Cancelar assinatura" }).click();

  // Sem toast/redirect nessa action pra esperar: cancelarAssinatura roda
  // dentro de um useTransition, então nem "networkidle" nem o próprio
  // clique garantem que a Server Action já terminou no servidor — poll no
  // banco (a garantia real que a action dá) até refletir, em vez de um
  // sleep arbitrário.
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await expect
    .poll(
      async () => {
        const { rows } = await db.query('SELECT "statusAssinatura" FROM "Revendedor" WHERE email = $1', [EMAIL]);
        return rows[0]?.statusAssinatura;
      },
      { timeout: 10000 }
    )
    .toBe("CANCELADO");

  const { rows } = await db.query('SELECT "motivoCancelamento" FROM "Revendedor" WHERE email = $1', [EMAIL]);
  expect(rows[0].motivoCancelamento).toBe("Teste automatizado E2E");
  await db.end();
});
