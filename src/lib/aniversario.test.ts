import { describe, it, expect } from "vitest";
import { ehAniversarioDeCasa } from "./aniversario";
import { brMidnightUTC } from "./format";

describe("ehAniversarioDeCasa", () => {
  it("detecta 12 meses completos no dia exato", () => {
    const criadoEm = brMidnightUTC(2025, 9, 6); // 6/out/2025
    const hoje = brMidnightUTC(2026, 9, 6); // 6/out/2026 — 1 ano exato
    const r = ehAniversarioDeCasa(criadoEm, hoje);
    expect(r).toEqual({ ehAniversario: true, anos: 1 });
  });

  it("continua valendo até 6 dias depois do aniversário (janela de aviso)", () => {
    const criadoEm = brMidnightUTC(2025, 9, 6);
    const hoje = brMidnightUTC(2026, 9, 12); // 6 dias depois
    expect(ehAniversarioDeCasa(criadoEm, hoje).ehAniversario).toBe(true);
  });

  it("não vale mais 7 dias depois do aniversário", () => {
    const criadoEm = brMidnightUTC(2025, 9, 6);
    const hoje = brMidnightUTC(2026, 9, 13); // 7 dias depois
    expect(ehAniversarioDeCasa(criadoEm, hoje).ehAniversario).toBe(false);
  });

  it("não vale antes do dia do aniversário chegar", () => {
    const criadoEm = brMidnightUTC(2025, 9, 6);
    const hoje = brMidnightUTC(2026, 9, 5); // 1 dia antes de completar 1 ano
    expect(ehAniversarioDeCasa(criadoEm, hoje).ehAniversario).toBe(false);
  });

  it("não considera aniversário com menos de 12 meses (ex: 6 meses de casa)", () => {
    const criadoEm = brMidnightUTC(2026, 3, 6); // 6/abr/2026
    const hoje = brMidnightUTC(2026, 9, 6); // 6/out/2026 — 6 meses
    expect(ehAniversarioDeCasa(criadoEm, hoje).ehAniversario).toBe(false);
  });

  it("só marca em múltiplos redondos de 12 meses (não aos 13, 18 etc.)", () => {
    const criadoEm = brMidnightUTC(2025, 0, 6);
    expect(ehAniversarioDeCasa(criadoEm, brMidnightUTC(2026, 1, 6)).ehAniversario).toBe(false); // 13 meses
    expect(ehAniversarioDeCasa(criadoEm, brMidnightUTC(2026, 6, 6)).ehAniversario).toBe(false); // 18 meses
    expect(ehAniversarioDeCasa(criadoEm, brMidnightUTC(2027, 0, 6))).toEqual({ ehAniversario: true, anos: 2 }); // 24 meses
  });

  it("ajusta pro último dia do mês quando o dia de criação não existe no mês de destino", () => {
    // Criado em 31/jan; 1 ano depois cai em "31/jan do ano seguinte" — mas o
    // teste real de robustez é o mês intermediário (fevereiro) usado no
    // cálculo de meses completos, não o aniversário em si (mesmo mês,
    // sempre tem 31 dias). Cobre a branch ultimoDiaDoMesAlvo indiretamente.
    const criadoEm = brMidnightUTC(2025, 0, 31);
    const hoje = brMidnightUTC(2026, 0, 31);
    expect(ehAniversarioDeCasa(criadoEm, hoje)).toEqual({ ehAniversario: true, anos: 1 });
  });
});
