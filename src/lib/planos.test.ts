import { describe, it, expect } from "vitest";
import { diasParaVencer, faixaVencimento, calcularVencimento, calcularVencimentoComDiaFixo, PLANO_DIAS } from "./planos";
import { brMidnightUTC } from "./format";

describe("diasParaVencer", () => {
  it("é 0 no próprio dia do vencimento, mesmo com horas diferentes", () => {
    const vencimento = brMidnightUTC(2026, 9, 10);
    const hoje = new Date("2026-10-10T18:00:00.000Z"); // tarde do mesmo dia em Brasília
    expect(diasParaVencer(vencimento, hoje)).toBe(0);
  });

  it("conta positivo pra quem ainda não venceu e negativo pra quem já venceu", () => {
    const vencimento = brMidnightUTC(2026, 9, 10);
    expect(diasParaVencer(vencimento, brMidnightUTC(2026, 9, 7))).toBe(3);
    expect(diasParaVencer(vencimento, brMidnightUTC(2026, 9, 13))).toBe(-3);
  });
});

describe("faixaVencimento", () => {
  it("classifica vencido, até 5 dias e em dia corretamente nas bordas", () => {
    const vencimento = brMidnightUTC(2026, 9, 10);
    expect(faixaVencimento(vencimento, brMidnightUTC(2026, 9, 11))).toBe("VENCIDO");
    expect(faixaVencimento(vencimento, brMidnightUTC(2026, 9, 10))).toBe("ATE_5_DIAS"); // 0 dias
    expect(faixaVencimento(vencimento, brMidnightUTC(2026, 9, 5))).toBe("ATE_5_DIAS"); // exatamente 5
    expect(faixaVencimento(vencimento, brMidnightUTC(2026, 9, 4))).toBe("EM_DIA"); // 6 dias
  });
});

describe("calcularVencimento", () => {
  it("soma os dias certos de cada plano a partir de hoje", () => {
    const base = brMidnightUTC(2026, 0, 1);
    for (const plano of Object.keys(PLANO_DIAS) as (keyof typeof PLANO_DIAS)[]) {
      const venc = calcularVencimento(plano, base);
      const diasReais = Math.round((venc.getTime() - base.getTime()) / 86400000);
      expect(diasReais).toBe(PLANO_DIAS[plano]);
    }
  });
});

describe("calcularVencimentoComDiaFixo", () => {
  it("sem diaFixo, devolve o vencimento natural do plano", () => {
    const base = brMidnightUTC(2026, 0, 15);
    expect(calcularVencimentoComDiaFixo("MENSAL", base, null).getTime()).toBe(calcularVencimento("MENSAL", base).getTime());
  });

  it("ajusta pro dia fixo quando ele cai dentro da tolerância de 6 dias antes do natural", () => {
    // MENSAL a partir de 20/jan (31 dias) vence 20/fev. Dia fixo 15: fica 5
    // dias antes do natural — dentro da tolerância, aceita (fica em fevereiro).
    const base = brMidnightUTC(2026, 0, 20);
    const venc = calcularVencimentoComDiaFixo("MENSAL", base, 15);
    expect(venc.toISOString()).toBe(brMidnightUTC(2026, 1, 15).toISOString());
  });

  it("não encurta o plano além de 6 dias: dia fixo muito antes do natural empurra pro mês seguinte", () => {
    // Mesmo vencimento natural (20/fev), dia fixo 13: fica 7 dias antes do
    // natural — já passa da tolerância de 6, tem que empurrar pro dia 13 do
    // mês SEGUINTE (março), não encurtar o plano pra 13/fev.
    const base = brMidnightUTC(2026, 0, 20);
    const venc = calcularVencimentoComDiaFixo("MENSAL", base, 13);
    expect(venc.toISOString()).toBe(brMidnightUTC(2026, 2, 13).toISOString());
  });

  it("aceita o dia fixo exatamente no limite de 6 dias antes do natural (regressão do bug já corrigido)", () => {
    // Mesmo vencimento natural (20/fev) do teste acima: dia fixo 14 está
    // EXATAMENTE 6 dias antes — tem que ACEITAR (>=, não >), não empurrar.
    // O bug original comparava a hora de "agora" (herdada de apartirDe)
    // contra a meia-noite fixa do candidato, fazendo o 6º dia exato nunca
    // bater; por isso a função sempre compara meia-noite com meia-noite.
    const base = brMidnightUTC(2026, 0, 20);
    const comHoraNoMeioDoDia = new Date(base.getTime() + 15 * 3600000); // 15h, não meia-noite
    const venc = calcularVencimentoComDiaFixo("MENSAL", comHoraNoMeioDoDia, 14);
    expect(venc.toISOString()).toBe(brMidnightUTC(2026, 1, 14).toISOString());
  });

  it("ajusta pro último dia do mês quando o dia fixo não existe nele (ex: 31 em fevereiro)", () => {
    const base = brMidnightUTC(2026, 0, 1); // vencimento natural: 1º/fev (28 dias em 2026, não bissexto)
    const venc = calcularVencimentoComDiaFixo("MENSAL", base, 31);
    expect(venc.toISOString()).toBe(brMidnightUTC(2026, 1, 28).toISOString());
  });
});
