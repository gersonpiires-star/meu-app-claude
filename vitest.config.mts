import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    // Testes cobrem regra de negócio pura (datas, créditos, vencimentos) —
    // nenhum precisa de DOM nem de banco, roda tudo em Node puro.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
