function mesesComoCliente(criadoEm: Date, hoje: Date): number {
  let m = (hoje.getFullYear() - criadoEm.getFullYear()) * 12 + (hoje.getMonth() - criadoEm.getMonth());
  if (hoje.getDate() < criadoEm.getDate()) m -= 1;
  return Math.max(0, m);
}

function diasDesdeAniversario(criadoEm: Date, hoje: Date, meses: number): number {
  const alvo = new Date(criadoEm.getFullYear(), criadoEm.getMonth() + meses, 1);
  const ultimoDiaDoMesAlvo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  const dataAniversario = new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(criadoEm.getDate(), ultimoDiaDoMesAlvo));
  return Math.round((hoje.getTime() - dataAniversario.getTime()) / 86400000);
}

// Cliente que completou um ano "redondo" de casa (12, 24, 36... meses) nos
// últimos 7 dias.
export function ehAniversarioDeCasa(criadoEm: Date, hoje: Date = new Date()): { ehAniversario: boolean; anos: number } {
  const meses = mesesComoCliente(criadoEm, hoje);
  if (meses < 12 || meses % 12 !== 0) return { ehAniversario: false, anos: 0 };
  const dias = diasDesdeAniversario(criadoEm, hoje, meses);
  return { ehAniversario: dias >= 0 && dias < 7, anos: Math.floor(meses / 12) };
}
