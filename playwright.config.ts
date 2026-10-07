import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

// Suite ainda pequena (fluxo essencial: cadastro -> login -> criar cliente)
// e serial de propósito — os testes dependem da mesma conta criada no
// primeiro teste, e o /api/cadastro tem rate limit de 5/60s por IP (todos
// os testes rodam do mesmo IP local).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  // Timeout maior que o padrão (5s) porque em dev o Turbopack compila cada
  // rota na primeira visita (lazy) — o próprio "next dev" é o alvo aqui,
  // não um build de produção.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Este container já vem com o Chromium pré-instalado; aponta pro
        // binário fixo em vez de deixar o Playwright procurar a revisão
        // (chrome-headless-shell) que ele mesmo baixaria — essa revisão não
        // existe aqui e "playwright install" não deve ser executado.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
});
