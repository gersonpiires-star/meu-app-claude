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

export type LancamentoDiario = { data: Date; valor: number };

// Acumula uma lista de lançamentos (já buscada no banco, cobrindo do início
// do mês anterior até hoje) dia a dia no mês atual e no mês anterior, pra
// comparar "quanto já entrou esse mês" com "quanto tinha entrado até esse
// mesmo dia no mês passado" — mesmo padrão de serieReceitaMes() (lib/dados.ts)
// e serieReceitaMesAdmin() (lib/dados-admin.ts), que reimplementavam isso
// cada um a sua vez somando fontes diferentes (Renovacao+Venda vs Pagamento).
// Que fonte buscar e como somar o valor de cada uma fica com quem chama;
// aqui só entra a lista final de {data, valor}.
export function serieAcumuladaDoMes(lancamentos: LancamentoDiario[], agora: Date = new Date()) {
  const { ano, mes, dia } = diaCivilBr(agora);
  const inicioAnterior = brMidnightUTC(ano, mes - 1, 1);
  const fim = brMidnightUTC(ano, mes + 1, 1);

  const diasMesAnterior = diaCivilBr(new Date(brMidnightUTC(ano, mes, 1).getTime() - 1)).dia;
  const atual = new Array<number>(dia).fill(0);
  const anterior = new Array<number>(diasMesAnterior).fill(0);
  for (const { data, valor } of lancamentos) {
    const d = diaCivilBr(data);
    if (d.ano === ano && d.mes === mes && d.dia <= dia) atual[d.dia - 1] += valor;
    else if (d.dia <= diasMesAnterior && brMidnightUTC(d.ano, d.mes, 1).getTime() === inicioAnterior.getTime()) anterior[d.dia - 1] += valor;
  }

  const acumular = (xs: number[]) => {
    let s = 0;
    return xs.map((x) => (s += x));
  };
  const acumAtual = acumular(atual);
  const acumAnterior = acumular(anterior);
  const anteriorAteHoje = acumAnterior[Math.min(dia, diasMesAnterior) - 1] ?? 0;
  const totalAtual = acumAtual[acumAtual.length - 1] ?? 0;
  const variacaoPct = anteriorAteHoje > 0 ? ((totalAtual - anteriorAteHoje) / anteriorAteHoje) * 100 : null;

  const diasNoMes = diaCivilBr(new Date(fim.getTime() - 1)).dia;
  return { acumulado: acumAtual, variacaoPct, diasRestantes: diasNoMes - dia, mesAnteriorIdx: (mes + 11) % 12 };
}
