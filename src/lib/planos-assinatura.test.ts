import { describe, it, expect } from "vitest";
import { assinaturaVencida, adicionarMeses, planoDosMeses } from "./planos-assinatura";

describe("assinaturaVencida", () => {
  // Regressão direta do bug "conta vencida aparecia como Ativa" no painel
  // admin: statusAssinatura ficava "ATIVO" no banco até o próximo evento do
  // gateway, então checar só esse campo não bastava — precisa olhar
  // assinaturaVence também.
  it("é vencida quando ATIVO mas a data de vencimento já passou", () => {
    const agora = new Date("2026-10-06T12:00:00.000Z");
    const venceuOntem = new Date("2026-10-05T12:00:00.000Z");
    expect(assinaturaVencida("ATIVO", venceuOntem, agora)).toBe(true);
  });

  it("não é vencida quando ATIVO e ainda não chegou no vencimento", () => {
    const agora = new Date("2026-10-06T12:00:00.000Z");
    const venceAmanha = new Date("2026-10-07T12:00:00.000Z");
    expect(assinaturaVencida("ATIVO", venceAmanha, agora)).toBe(false);
  });

  it("é vencida no instante exato do vencimento (<=, não <)", () => {
    const agora = new Date("2026-10-06T12:00:00.000Z");
    expect(assinaturaVencida("ATIVO", agora, agora)).toBe(true);
  });

  it("nunca é 'vencida' sem data de vencimento (ex: nunca pagou ainda)", () => {
    expect(assinaturaVencida("ATIVO", null)).toBe(false);
  });

  it("só se aplica a contas ATIVO — PAUSADO/CANCELADO/TRIAL têm status próprio, não 'vencida'", () => {
    const vencida = new Date("2000-01-01T00:00:00.000Z");
    expect(assinaturaVencida("PAUSADO", vencida)).toBe(false);
    expect(assinaturaVencida("CANCELADO", vencida)).toBe(false);
    expect(assinaturaVencida("TRIAL", vencida)).toBe(false);
  });
});

describe("planoDosMeses", () => {
  it("classifica a quantidade de meses no plano certo", () => {
    expect(planoDosMeses(1)).toBe("MENSAL");
    expect(planoDosMeses(5)).toBe("MENSAL");
    expect(planoDosMeses(6)).toBe("SEMESTRAL");
    expect(planoDosMeses(11)).toBe("SEMESTRAL");
    expect(planoDosMeses(12)).toBe("ANUAL");
    expect(planoDosMeses(24)).toBe("ANUAL");
  });
});

describe("adicionarMeses", () => {
  it("soma meses mantendo o dia quando o mês de destino tem dias suficientes", () => {
    const resultado = adicionarMeses(new Date(2026, 0, 15), 2);
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(2); // março
    expect(resultado.getDate()).toBe(15);
  });

  it("não transborda pro mês seguinte quando o mês de destino tem menos dias (31/jan + 1 mês)", () => {
    // Date.setMonth ingênuo faria 31/jan + 1 mês virar 3/mar (fevereiro só
    // tem 28/29 dias) — adicionarMeses existe pra evitar exatamente isso.
    const resultado = adicionarMeses(new Date(2026, 0, 31), 1);
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(1); // fevereiro, não março
    expect(resultado.getDate()).toBe(28); // último dia de fevereiro (2026 não é bissexto)
  });

  it("vira o ano corretamente", () => {
    const resultado = adicionarMeses(new Date(2026, 11, 10), 2);
    expect(resultado.getFullYear()).toBe(2027);
    expect(resultado.getMonth()).toBe(1); // fevereiro
    expect(resultado.getDate()).toBe(10);
  });
});
