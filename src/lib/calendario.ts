import { diaCivilBr } from "@/lib/format";

export type UrgenciaDia = "vencido" | "vencendo" | "ok";

export type CelulaCalendario = {
  dia: number | null;
  qtd: number;
  urgencia: UrgenciaDia | null;
  clientes: string[];
};

export type VencimentoCliente = { nome: string; vencimento: Date };

// Grade do mês (domingo primeiro) com quantos clientes vencem em cada dia,
// a urgência (pra colorir) com base em quantos dias faltam pra hoje, e os
// nomes dos clientes daquele dia (pra mostrar ao passar o mouse ou tocar).
export function gradeDoMes(vencimentos: VencimentoCliente[], referencia: Date = new Date()): CelulaCalendario[] {
  const { ano, mes } = diaCivilBr(referencia);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const hojeCivil = diaCivilBr(new Date());
  const hoje = new Date(hojeCivil.ano, hojeCivil.mes, hojeCivil.dia);

  const porDia = new Map<number, string[]>();
  for (const v of vencimentos) {
    const vc = diaCivilBr(v.vencimento);
    if (vc.ano === ano && vc.mes === mes) {
      const d = vc.dia;
      const atual = porDia.get(d) ?? [];
      atual.push(v.nome);
      porDia.set(d, atual);
    }
  }

  const celulas: CelulaCalendario[] = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push({ dia: null, qtd: 0, urgencia: null, clientes: [] });

  for (let d = 1; d <= diasNoMes; d++) {
    const clientes = porDia.get(d) ?? [];
    const qtd = clientes.length;
    let urgencia: UrgenciaDia | null = null;
    if (qtd > 0) {
      const diffDias = Math.round((new Date(ano, mes, d).getTime() - hoje.getTime()) / 86400000);
      urgencia = diffDias < 0 ? "vencido" : diffDias <= 5 ? "vencendo" : "ok";
    }
    celulas.push({ dia: d, qtd, urgencia, clientes });
  }
  return celulas;
}
