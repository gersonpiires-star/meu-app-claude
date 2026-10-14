import { describe, it, expect } from "vitest";
import { limitesDoMes, lotesAbertos, consumirFifo, filaDeJson, type MovimentoOrdenavel, type Lote } from "./dados";

function mov(id: string, tipo: "ENTRADA" | "SAIDA", quantidade: number, custoUnitario: number, data: string): MovimentoOrdenavel {
  return { id, tipo, quantidade, custoUnitario, data: new Date(data) };
}

describe("limitesDoMes", () => {
  it("devolve meia-noite de Brasília do 1º ao 1º do mês seguinte, a partir de um instante real do meio do mês", () => {
    const { inicio, fim } = limitesDoMes(new Date("2026-10-15T18:00:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("ainda pega o mês certo perto da virada (pouco antes da meia-noite de Brasília no fim do mês)", () => {
    // 02:59 UTC de 1º/nov ainda são 31/out em Brasília — tem que continuar
    // outubro, não pular pra novembro um dia cedo.
    const { inicio, fim } = limitesDoMes(new Date("2026-11-01T02:59:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("vira pro mês novo exatamente na meia-noite de Brasília", () => {
    const { inicio, fim } = limitesDoMes(new Date("2026-11-01T03:00:00.000Z"));
    expect(inicio.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("usa 'agora' por padrão quando nenhuma referência é passada", () => {
    const { inicio, fim } = limitesDoMes();
    expect(inicio.getTime()).toBeLessThan(fim.getTime());
    expect(fim.getTime() - inicio.getTime()).toBeGreaterThan(27 * 86400000); // todo mês tem ao menos 28 dias
  });
});

describe("consumirFifo", () => {
  it("consome do lote mais antigo primeiro e some com ele quando esgota", () => {
    const fila: Lote[] = [
      { restante: 2, custoUnitario: 100 },
      { restante: 5, custoUnitario: 150 },
    ];
    const custo = consumirFifo(fila, 3);
    expect(custo).toBe(2 * 100 + 1 * 150); // os 2 do primeiro lote + 1 do segundo
    expect(fila).toEqual([{ restante: 4, custoUnitario: 150 }]); // 1º lote esgotado some da fila
  });

  it("para de consumir se a fila acabar antes da quantidade pedida (sem erro, sem ficar negativo)", () => {
    const fila: Lote[] = [{ restante: 2, custoUnitario: 100 }];
    const custo = consumirFifo(fila, 10);
    expect(custo).toBe(2 * 100);
    expect(fila).toEqual([]);
  });
});

describe("lotesAbertos", () => {
  it("calcula o custo médio só do que ainda não foi vendido, não da vida inteira do produto", () => {
    // 10 un a R$100 (entrada antiga e mais barata), depois 10 un a R$200
    // (entrada mais cara). Vende 10 — consome o lote de R$100 inteiro.
    // Custo médio do que sobrou tem que ser R$200, nunca uma média dos dois.
    const movimentos = [
      mov("e1", "ENTRADA", 10, 100, "2026-01-01"),
      mov("e2", "ENTRADA", 10, 200, "2026-01-10"),
      mov("s1", "SAIDA", 10, 0, "2026-01-15"), // custoUnitario da saída não é usado pra isso, FIFO decide
    ];
    const { fila, qtdEntrada, qtdSaida } = lotesAbertos(movimentos);
    expect(fila).toEqual([{ restante: 10, custoUnitario: 200 }]);
    expect(qtdEntrada).toBe(20);
    expect(qtdSaida).toBe(10);
  });

  it("reordena os movimentos por data antes de processar, não confia na ordem recebida", () => {
    // Mesmos 3 movimentos do teste acima, só que passados fora de ordem —
    // tem que dar exatamente o mesmo resultado, porque quem lê do banco não
    // garante nenhuma ordem específica sem orderBy explícito.
    const movimentos = [
      mov("s1", "SAIDA", 10, 0, "2026-01-15"),
      mov("e2", "ENTRADA", 10, 200, "2026-01-10"),
      mov("e1", "ENTRADA", 10, 100, "2026-01-01"),
    ];
    const { fila } = lotesAbertos(movimentos);
    expect(fila).toEqual([{ restante: 10, custoUnitario: 200 }]);
  });

  it("desempata movimentos no mesmo instante pelo id, de forma determinística", () => {
    // Duas entradas exatamente na mesma data: sem desempate por id, a ordem
    // de consumo da saída seguinte dependeria da ordem de chegada do banco
    // (não garantida), podendo mudar o custo médio calculado entre duas
    // chamadas pros mesmos dados.
    const data = "2026-01-01T12:00:00.000Z";
    const a = [mov("a", "ENTRADA", 5, 100, data), mov("b", "ENTRADA", 5, 200, data), mov("s", "SAIDA", 5, 0, "2026-01-02")];
    const b = [mov("b", "ENTRADA", 5, 200, data), mov("a", "ENTRADA", 5, 100, data), mov("s", "SAIDA", 5, 0, "2026-01-02")];
    expect(lotesAbertos(a).fila).toEqual(lotesAbertos(b).fila);
    expect(lotesAbertos(a).fila).toEqual([{ restante: 5, custoUnitario: 200 }]); // "a" (id menor) é consumido primeiro
  });

  it("sem nenhum movimento, devolve fila vazia e totais zerados", () => {
    expect(lotesAbertos([])).toEqual({ fila: [], qtdEntrada: 0, qtdSaida: 0 });
  });
});

describe("filaDeJson", () => {
  // Produto.lotesAbertosJson é escrito só por código interno (nunca por
  // input de usuário), mas é dado persistido — um deploy que mudasse o
  // formato, ou uma linha corrompida, não pode quebrar Painel/Estoque pra
  // todo mundo. Cada caso aqui é uma forma de "isso não devia estar nessa
  // coluna, mas se estiver, ignora em vez de derrubar a tela".
  it("faz o caminho de ida e volta com o formato gravado por registrarMovimentoEstoque", () => {
    const fila: Lote[] = [
      { restante: 3, custoUnitario: 120.5 },
      { restante: 1, custoUnitario: 200 },
    ];
    expect(filaDeJson(JSON.parse(JSON.stringify(fila)))).toEqual(fila);
  });

  it("valor padrão da coluna ([]) e null/undefined viram fila vazia", () => {
    expect(filaDeJson([])).toEqual([]);
    expect(filaDeJson(null)).toEqual([]);
  });

  it("não é um array (campo corrompido ou nunca inicializado) vira fila vazia, não erro", () => {
    expect(filaDeJson("não é json de fila" as never)).toEqual([]);
    expect(filaDeJson({ restante: 1, custoUnitario: 2 } as never)).toEqual([]);
  });

  it("descarta só os itens malformados dentro do array, mantém os válidos", () => {
    const entrada = [
      { restante: 5, custoUnitario: 100 },
      { restante: "cinco", custoUnitario: 100 }, // tipo errado
      { restante: 2 }, // custoUnitario faltando
      null,
      "string solta",
      { restante: 3, custoUnitario: 50 },
    ];
    expect(filaDeJson(entrada as never)).toEqual([
      { restante: 5, custoUnitario: 100 },
      { restante: 3, custoUnitario: 50 },
    ]);
  });
});
