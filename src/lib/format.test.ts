import { describe, it, expect } from "vitest";
import { diaCivilBr, brMidnightUTC, inicioDoDiaBr, parseDataBr, dataCurta, diaDaSemana } from "./format";

describe("diaCivilBr", () => {
  it("lê o dia certo em Brasília no meio do dia, longe de qualquer virada", () => {
    expect(diaCivilBr(new Date("2026-06-15T18:00:00.000Z"))).toEqual({ ano: 2026, mes: 5, dia: 15 });
  });

  it("ainda é o dia anterior em Brasília um pouco antes da meia-noite de Brasília (03:00 UTC)", () => {
    // 02:59 UTC do dia 2 ainda são 23:59 do dia 1 em Brasília (UTC-3).
    expect(diaCivilBr(new Date("2026-06-02T02:59:00.000Z"))).toEqual({ ano: 2026, mes: 5, dia: 1 });
  });

  it("já virou o dia certo exatamente às 03:00 UTC (meia-noite em Brasília)", () => {
    expect(diaCivilBr(new Date("2026-06-02T03:00:00.000Z"))).toEqual({ ano: 2026, mes: 5, dia: 2 });
  });

  it("vira o mês (e o ano) certo na virada do ano, não só o dia", () => {
    // 02:59 UTC de 1º de janeiro ainda são 31 de dezembro em Brasília.
    expect(diaCivilBr(new Date("2026-01-01T02:59:00.000Z"))).toEqual({ ano: 2025, mes: 11, dia: 31 });
    expect(diaCivilBr(new Date("2026-01-01T03:00:00.000Z"))).toEqual({ ano: 2026, mes: 0, dia: 1 });
  });
});

describe("brMidnightUTC", () => {
  it("monta o instante exato da meia-noite de Brasília (03:00 UTC)", () => {
    expect(brMidnightUTC(2026, 9, 1).toISOString()).toBe("2026-10-01T03:00:00.000Z");
  });

  it("normaliza mês fora da faixa 0-11 igual o Date nativo (vira o ano)", () => {
    // mes=12 (dezembro + 1) deve virar janeiro do ano seguinte, igual
    // Date.UTC nativo — usado pra calcular o "fim do mês" como
    // brMidnightUTC(ano, mes + 1, 1) sem checar virada de ano na mão.
    expect(brMidnightUTC(2026, 12, 1).toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("é a inversa de diaCivilBr: ida e volta preserva ano/mes/dia", () => {
    const { ano, mes, dia } = diaCivilBr(new Date("2026-10-06T15:00:00.000Z"));
    expect(diaCivilBr(brMidnightUTC(ano, mes, dia))).toEqual({ ano, mes, dia });
  });
});

describe("inicioDoDiaBr", () => {
  it("bate com brMidnightUTC(diaCivilBr(referencia))", () => {
    const referencia = new Date("2026-10-06T15:00:00.000Z");
    const { ano, mes, dia } = diaCivilBr(referencia);
    expect(inicioDoDiaBr(referencia).getTime()).toBe(brMidnightUTC(ano, mes, dia).getTime());
  });
});

// Regressão direta do bug corrigido em receitaMensalAdmin/cobranca-automatica:
// um `new Date(ano, mes, dia)` construído no fuso do servidor (UTC em
// produção) NÃO é a mesma meia-noite que brMidnightUTC monta — é 3h mais
// cedo. Qualquer função nova que precise de "meia-noite em Brasília" deve
// usar brMidnightUTC/inicioDoDiaBr, nunca `new Date(ano, mes, dia)' puro.
describe("anti-padrão: new Date(ano, mes, dia) local não é meia-noite em Brasília", () => {
  it("fica 3h antes do verdadeiro início do dia em Brasília (quando o processo roda em UTC)", () => {
    const localmenteConstruido = new Date(2026, 9, 1); // 1º de outubro, fuso do processo
    const meiaNoiteBrasiliaReal = brMidnightUTC(2026, 9, 1);
    expect(localmenteConstruido.getTime()).toBe(meiaNoiteBrasiliaReal.getTime() - 3 * 60 * 60000);
  });
});

describe("parseDataBr", () => {
  it("interpreta DD/MM/AAAA como meia-noite em Brasília", () => {
    expect(parseDataBr("06/10/2026")?.toISOString()).toBe(brMidnightUTC(2026, 9, 6).toISOString());
  });

  it("rejeita dia inválido pro mês (31 de fevereiro)", () => {
    expect(parseDataBr("31/02/2026")).toBeNull();
  });

  it("rejeita mês fora de 1-12", () => {
    expect(parseDataBr("10/13/2026")).toBeNull();
  });

  it("rejeita texto vazio ou malformado", () => {
    expect(parseDataBr("")).toBeNull();
    expect(parseDataBr(undefined)).toBeNull();
    expect(parseDataBr("lixo")).toBeNull();
  });
});

describe("diaDaSemana", () => {
  it("reconhece a semana de 4 a 10/out/2026 (domingo a sábado)", () => {
    expect(diaDaSemana({ ano: 2026, mes: 9, dia: 4 })).toBe(0); // domingo
    expect(diaDaSemana({ ano: 2026, mes: 9, dia: 5 })).toBe(1); // segunda
    expect(diaDaSemana({ ano: 2026, mes: 9, dia: 6 })).toBe(2); // terça
    expect(diaDaSemana({ ano: 2026, mes: 9, dia: 10 })).toBe(6); // sábado
  });
});

describe("dataCurta", () => {
  it("formata DD/MM no fuso de Brasília", () => {
    expect(dataCurta(brMidnightUTC(2026, 9, 6))).toBe("06/10");
  });
});
