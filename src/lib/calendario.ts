export type UrgenciaDia = "vencido" | "vencendo" | "ok";

export type CelulaCalendario = {
  dia: number | null;
  qtd: number;
  urgencia: UrgenciaDia | null;
};

// Grade do mês (domingo primeiro) com quantos clientes vencem em cada dia,
// e a urgência (pra colorir) com base em quantos dias faltam pra hoje.
export function gradeDoMes(vencimentos: Date[], referencia: Date = new Date()): CelulaCalendario[] {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const hoje = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const porDia = new Map<number, number>();
  for (const v of vencimentos) {
    if (v.getFullYear() === ano && v.getMonth() === mes) {
      const d = v.getDate();
      porDia.set(d, (porDia.get(d) ?? 0) + 1);
    }
  }

  const celulas: CelulaCalendario[] = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push({ dia: null, qtd: 0, urgencia: null });

  for (let d = 1; d <= diasNoMes; d++) {
    const qtd = porDia.get(d) ?? 0;
    let urgencia: UrgenciaDia | null = null;
    if (qtd > 0) {
      const diffDias = Math.round((new Date(ano, mes, d).getTime() - hoje.getTime()) / 86400000);
      urgencia = diffDias < 0 ? "vencido" : diffDias <= 5 ? "vencendo" : "ok";
    }
    celulas.push({ dia: d, qtd, urgencia });
  }
  return celulas;
}
