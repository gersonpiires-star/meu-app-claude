import { test, expect, type Page } from "@playwright/test";
import { Client } from "pg";

// Fluxo essencial do produto: cadastro -> login -> criar cliente. Serial
// de propósito: os 3 testes usam a mesma conta (criada no primeiro), e
// /api/cadastro tem rate limit de 5/60s por IP — não dá pra criar uma
// conta nova por teste sem estourar o limite. Cada teste recebe uma `page`
// com contexto/cookies próprios (isolamento padrão do Playwright), então
// quem precisa estar logado faz o login de novo no início — não dá pra
// contar com a sessão do teste anterior.
test.describe.configure({ mode: "serial" });

const agora = Date.now();
const EMAIL = `e2e-${agora}@example.com`;
const SENHA = "senha123456";
const NOME = `Teste E2E ${agora}`;
const NOME_CLIENTE = `Cliente E2E ${agora}`;

async function login(page: Page) {
  await page.goto("/entrar");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-mail").fill(EMAIL);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
}

test.afterAll(async () => {
  // Limpa os dados criados pelo teste (cascade no schema apaga o cliente
  // junto) — sem isso a conta de teste ficaria pra sempre no banco. Usa
  // `pg` crua (não o client gerado do Prisma) porque esse módulo é ESM e
  // o transform de TS do Playwright Test não lida com ele.
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query('DELETE FROM "Revendedor" WHERE email = $1', [EMAIL]);
  await client.end();
});

test("cadastro cria a conta, loga automaticamente e mostra o checklist de onboarding", async ({ page }) => {
  await page.goto("/cadastro");
  // O SessionProvider do next-auth/react dispara /api/auth/session e
  // /api/auth/csrf em paralelo ao montar — se o submit acontece antes
  // desse ciclo inicial assentar, o POST pode levar um cookie de CSRF
  // diferente do que o signIn() buscou (corrida, vira "MissingCSRF").
  // Esperar a rede quietar aqui evita isso sem mexer no fluxo real do app.
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Nome completo").fill(NOME);
  await page.getByLabel("WhatsApp").fill("11999998888");
  await page.getByLabel("E-mail", { exact: true }).fill(EMAIL);
  await page.getByLabel("Senha", { exact: true }).fill(SENHA);
  await page.getByLabel("Confirmar senha").fill(SENHA);

  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  // Conta nova, sem cliente/serviço/chave Pix ainda -> checklist aparece.
  await expect(page.getByText("Primeiros passos")).toBeVisible();
});

test("login com a conta criada volta pro painel", async ({ page }) => {
  await login(page);
});

test("criar cliente aparece na página do cliente e na lista", async ({ page }) => {
  await login(page);

  await page.goto("/clientes/novo");
  await page.waitForLoadState("networkidle");
  // Por name, não por label: o <select> de Plano fica dentro do mesmo
  // <label> de um texto de ajuda condicional, e isso deixa getByLabel("Nome")
  // instável nesse formulário (nome do input é único, sem ambiguidade).
  await page.locator('input[name="nome"]').fill(NOME_CLIENTE);
  await page.getByRole("button", { name: "Salvar cliente" }).click();

  // criarCliente redireciona pra /clientes/[id] ao salvar com sucesso.
  await expect(page).toHaveURL(/\/clientes\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: NOME_CLIENTE })).toBeVisible();

  await page.goto("/clientes");
  // A lista renderiza o nome em dois layouts responsivos (um visível por
  // vez, conforme o breakpoint) — .first() evita a violação de strict mode
  // sem depender de qual dos dois está de fato visível no viewport do teste.
  await expect(page.getByText(NOME_CLIENTE).first()).toBeVisible();
});
