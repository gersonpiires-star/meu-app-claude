import { describe, it, expect } from "vitest";
import { faixasDosUltimosMeses } from "./meses";

describe("faixasDosUltimosMeses", () => {
  it("devolve o mês atual por último, com os rótulos certos (não deslocados)", () => {
    // Regressão direta do bug em receitaMensalAdmin: o gráfico "Receita por
    // mês" mostrava a receita de setembro sob o rótulo "out" porque a faixa
    // de busca de cada mês vinha deslocada um mês pra trás. Aqui fixamos
    // "agora" num instante real e conferimos que o último item da lista é
    // mesmo o mês de "agora", com os limites de busca caindo exatamente
    // nesse mês em Brasília.
    const agora = new Date("2026-10-06T15:00:00.000Z"); // 6 de outubro, meio da tarde em Brasília
    const faixas = faixasDosUltimosMeses(6, agora);

    expect(faixas).toHaveLength(6);
    expect(faixas.map((f) => `${f.ano}-${f.mes}`)).toEqual([
      "2026-4", // maio
      "2026-5", // junho
      "2026-6", // julho
      "2026-7", // agosto
      "2026-8", // setembro
      "2026-9", // outubro (mês atual — tem que ser o último)
    ]);

    const atual = faixas[5];
    expect(atual.inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(atual.fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");

    const anterior = faixas[4];
    expect(anterior.inicio.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(anterior.fim.toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("não inclui nenhum instante do mês seguinte nem do mês anterior ao mês atual", () => {
    // Simula a checagem real usada nas queries (`gte: inicio, lt: fim`).
    const dentroDaFaixa = (d: Date, inicio: Date, fim: Date) => d >= inicio && d < fim;

    const agora = new Date("2026-10-06T15:00:00.000Z");
    const { inicio, fim } = faixasDosUltimosMeses(1, agora)[0];

    const umaHoraAntesDoInicio = new Date(inicio.getTime() - 60 * 60000); // 23h59 de setembro em Brasília
    const exatamenteNoFim = new Date(fim.getTime()); // já é novembro
    const umMinutoAntesDoFim = new Date(fim.getTime() - 60000); // ainda outubro

    expect(dentroDaFaixa(umaHoraAntesDoInicio, inicio, fim)).toBe(false);
    expect(dentroDaFaixa(exatamenteNoFim, inicio, fim)).toBe(false);
    expect(dentroDaFaixa(umMinutoAntesDoFim, inicio, fim)).toBe(true);
  });

  it("vira o ano corretamente quando pede mais meses do que há no ano atual", () => {
    const agora = new Date("2026-02-10T15:00:00.000Z"); // fevereiro de 2026
    const faixas = faixasDosUltimosMeses(4, agora); // nov/25, dez/25, jan/26, fev/26

    expect(faixas.map((f) => `${f.ano}-${f.mes}`)).toEqual(["2025-10", "2025-11", "2026-0", "2026-1"]);
  });

  it("mês atual sozinho (quantidade=1) bate com o mês de 'agora'", () => {
    const agora = new Date("2026-12-25T23:00:00.000Z"); // ainda 25/dez em Brasília
    const [unico] = faixasDosUltimosMeses(1, agora);
    expect(unico.ano).toBe(2026);
    expect(unico.mes).toBe(11); // dezembro, 0-indexado
  });
});
