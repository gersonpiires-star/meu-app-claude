import { diaCivilBr } from "@/lib/format";

function mesesComoCliente(criadoEm: { ano: number; mes: number; dia: number }, hoje: { ano: number; mes: number; dia: number }): number {
  let m = (hoje.ano - criadoEm.ano) * 12 + (hoje.mes - criadoEm.mes);
  if (hoje.dia < criadoEm.dia) m -= 1;
  return Math.max(0, m);
}

function diasDesdeAniversario(
  criadoEm: { ano: number; mes: number; dia: number },
  hoje: { ano: number; mes: number; dia: number },
  meses: number
): number {
  const alvo = new Date(criadoEm.ano, criadoEm.mes + meses, 1);
  const ultimoDiaDoMesAlvo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const dataAniversario = new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(criadoEm.dia, ultimoDiaDoMesAlvo));
  const dataHoje = new Date(hoje.ano, hoje.mes, hoje.dia);
  return Math.round((dataHoje.getTime() - dataAniversario.getTime()) / 86400000);
}

// Cliente que completou um ano "redondo" de casa (12, 24, 36... meses) nos
// últimos 7 dias.
export function ehAniversarioDeCasa(criadoEm: Date, hoje: Date = new Date()): { ehAniversario: boolean; anos: number } {
  const criadoEmCivil = diaCivilBr(criadoEm);
  const hojeCivil = diaCivilBr(hoje);
  const meses = mesesComoCliente(criadoEmCivil, hojeCivil);
  if (meses < 12 || meses % 12 !== 0) return { ehAniversario: false, anos: 0 };
  const dias = diasDesdeAniversario(criadoEmCivil, hojeCivil, meses);
  return { ehAniversario: dias >= 0 && dias < 7, anos: Math.floor(meses / 12) };
}
