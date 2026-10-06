import { diaCivilBr, brMidnightUTC } from "@/lib/format";

export type FaixaMes = { ano: number; mes: number; inicio: Date; fim: Date };

// Gera os limites (início/fim, meia-noite em Brasília) dos últimos
// `quantidade` meses — do mais antigo pro mais recente (mês atual por
// último) — pra alimentar relatórios mensais (ultimosMeses, receitaMensalAdmin)
// sem reimplementar esse cálculo em cada um. Já vazou fuso horário duas vezes
// nesse projeto por reimplementações que passavam a data de referência local
// direto pra uma função que reinterpreta o instante pelo fuso (ver
// receitaMensalAdmin e cobranca-automatica no histórico de commits) — com
// tudo nascendo daqui, só precisa estar certo num lugar só.
export function faixasDosUltimosMeses(quantidade: number, agora: Date = new Date()): FaixaMes[] {
  const agoraCivil = diaCivilBr(agora);
  const faixas: FaixaMes[] = [];

  for (let i = quantidade - 1; i >= 0; i--) {
    // Aritmética local só pra normalizar virada de ano (ex: mês 11 - 2 vira
    // mês 9 do ano certo mesmo perto de dezembro/janeiro) — isso não vira
    // instante comparado a nada, então tanto faz o fuso do servidor aqui.
    // Os limites de busca abaixo (inicio/fim) é que precisam do instante
    // certo em Brasília, por isso usam brMidnightUTC direto a partir de
    // ano/mes já extraídos, nunca passando `referencia` adiante.
    const referencia = new Date(agoraCivil.ano, agoraCivil.mes - i, 1);
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth();
    faixas.push({ ano, mes, inicio: brMidnightUTC(ano, mes, 1), fim: brMidnightUTC(ano, mes + 1, 1) });
  }

  return faixas;
}
