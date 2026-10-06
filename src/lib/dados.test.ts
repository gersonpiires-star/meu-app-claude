import { describe, it, expect } from "vitest";
import { limitesDoMes } from "./dados";

describe("limitesDoMes", () => {
  it("devolve meia-noite de Brasília do 1º ao 1º do mês seguinte, a partir de um instante real do meio do mês", () => {
    const { inicio, fim } = limitesDoMes(new Date("2026-10-15T18:00:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("ainda pega o mês certo perto da virada (pouco antes da meia-noite de Brasília no fim do mês)", () => {
    // 02:59 UTC de 1º/nov ainda são 31/out em Brasília — tem que continuar
    // outubro, não pular pra novembro um dia cedo.
    const { inicio, fim } = limitesDoMes(new Date("2026-11-01T02:59:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("vira pro mês novo exatamente na meia-noite de Brasília", () => {
    const { inicio, fim } = limitesDoMes(new Date("2026-11-01T03:00:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("usa 'agora' por padrão quando nenhuma referência é passada", () => {
    const { inicio, fim } = limitesDoMes();
    expect(inicio.getTime()).toBeLessThan(fim.getTime());
    expect(fim.getTime() - inicio.getTime()).toBeGreaterThan(27 * 86400000); // todo mês tem ao menos 28 dias
  });
});
