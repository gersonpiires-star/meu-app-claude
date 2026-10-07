export type Guia = {
  slug: string;
  titulo: string;
  resumo: string;
  secoes: { titulo: string; paragrafos: string[] }[];
};

// Conteúdo pra SEO (`/guias`) — tópicos reais de quem revende streaming/IPTV,
// escrito a partir do que o próprio GestorPro resolve no dia a dia (créditos
// de plataforma, vencimento, planos). Nada de texto genérico de "melhores
// práticas de gestão" — cada guia resolve um problema concreto dessa revenda.
export const GUIAS: Guia[] = [
  {
    slug: "cobranca-de-clientes-de-streaming",
    titulo: "Como organizar a cobrança de clientes de streaming sem perder dinheiro",
    resumo:
      "O vencimento esquecido é a forma mais comum de uma revenda perder receita — não é o cliente que cancela, é quem revende que não cobra a tempo.",
    secoes: [
      {
        titulo: "O problema não é o cliente, é o controle",
        paragrafos: [
          "Na maioria das revendas que começam numa planilha ou num caderno, o dinheiro não some por causa de cliente mal-pagador — some porque ninguém lembrou de cobrar no dia certo. O cliente continua assistindo normalmente, o revendedor não percebe que o plano venceu há uma semana, e aquele mês fica sem receber por puro esquecimento.",
          "Isso piora com o tempo: quanto mais clientes, mais difícil é guardar de cabeça quem vence quando. Uma revenda com 15 clientes ainda dá pra controlar olhando uma planilha toda semana. Com 80, 150 clientes, essa checagem manual vira um trabalho em si — e é exatamente aí que a receita começa a vazar sem ninguém perceber.",
        ],
      },
      {
        titulo: "Separe aviso de cobrança de corte de acesso",
        paragrafos: [
          "São três momentos diferentes, e cada um pede uma mensagem diferente: um lembrete alguns dias antes do vencimento (pra quem paga assim que lembra, sem precisar de cobrança de verdade), um aviso no dia em que vence, e só depois — se ainda não pagou — uma cobrança mais direta.",
          "Misturar tudo numa única mensagem de 'seu plano vai vencer, pague ou corto' costuma soar agressivo demais pra quem ia pagar de qualquer jeito, e ao mesmo tempo é fraco demais pra quem realmente só paga sob pressão. Separar os estágios deixa a comunicação mais natural e reduz o número de clientes que somem sem avisar.",
        ],
      },
      {
        titulo: "Automatize o lembrete, não a decisão",
        paragrafos: [
          "A parte que vale automatizar é a mecânica: saber quem vence hoje, quem venceu e ainda não pagou, e disparar a mensagem certa pra cada caso sem precisar abrir uma planilha e cruzar datas na mão. Isso é o que elimina o esquecimento.",
          "A decisão de como tratar cada cliente — dar um desconto pra quem é antigo, tolerar um atraso de quem sempre paga, cancelar de vez quem já sumiu duas vezes — essa parte continua sendo sua. Ferramenta boa automatiza o lembrete e deixa a decisão com quem conhece o cliente.",
        ],
      },
      {
        titulo: "Um número que vale acompanhar: cobrados vs. vencidos",
        paragrafos: [
          "No fim do dia, a pergunta mais útil não é 'quanto eu já recebi', é 'quantos dos que venceram hoje eu já cobrei'. Se esse número fica baixo com frequência, o problema não é o cliente — é o processo de cobrança que não está acontecendo todo dia.",
        ],
      },
    ],
  },
  {
    slug: "planilha-ou-sistema-de-gestao",
    titulo: "Planilha ou sistema de gestão: o que realmente muda na revenda",
    resumo:
      "A planilha funciona até um certo tamanho — o problema é que ninguém sabe exatamente qual é esse tamanho até passar dele.",
    secoes: [
      {
        titulo: "Onde a planilha quebra primeiro",
        paragrafos: [
          "Não é o número de linhas que quebra uma planilha de controle de clientes — é a quantidade de coisas que precisam ficar certas ao mesmo tempo: data de vencimento, valor do plano, se já renovou esse mês, se o crédito da plataforma ainda cobre esse cliente, se o WhatsApp dele mudou. Um erro de digitação numa data de vencimento não dá erro nenhum — a planilha aceita qualquer coisa. Só aparece como problema semanas depois, quando o cliente reclama que foi cobrado errado ou que o acesso caiu sem aviso.",
          "O outro ponto cego clássico é duplicidade: cadastrar o mesmo cliente duas vezes (uma vez com o nome certo, outra com um apelido) é fácil de fazer e difícil de perceber numa planilha com centenas de linhas.",
        ],
      },
      {
        titulo: "O que um sistema resolve que planilha não resolve sozinha",
        paragrafos: [
          "Três coisas, na prática: a conta certa (vencimento calculado a partir do plano, não digitado à mão toda renovação), o controle de crédito (saber se a plataforma ainda tem saldo antes de vender mais uma tela, em vez de descobrir depois que vendeu sem ter de onde tirar), e o histórico (quando cada cliente pagou, quanto, e se foi pontual ou sempre atrasado — dado que ajuda a decidir quem merece um desconto e quem não vale mais o esforço de cobrar).",
          "Nenhuma dessas três coisas é impossível de fazer numa planilha bem montada. A diferença é que, numa planilha, cada uma dessas regras depende de alguém lembrar de aplicá-la certo, toda vez. Num sistema, a regra é automática — e é exatamente isso que deixa de dar erro quando o número de clientes cresce.",
        ],
      },
      {
        titulo: "Quando ainda compensa ficar na planilha",
        paragrafos: [
          "Pra quem tem poucos clientes e atualiza a planilha com disciplina, ela funciona bem — o custo de trocar de ferramenta só compensa quando o tempo gasto corrigindo erro de planilha (ou o dinheiro perdido por vencimento esquecido) passa a pesar mais que o trabalho de migrar pra um sistema.",
        ],
      },
    ],
  },
  {
    slug: "calcular-lucro-real-da-revenda",
    titulo: "Como calcular o lucro real da sua revenda de streaming",
    resumo:
      "Receita não é lucro — o erro mais comum de quem revende é olhar só quanto entrou no mês e esquecer quanto saiu pra comprar o crédito que sustenta esse plano.",
    secoes: [
      {
        titulo: "Receita bruta esconde a conta real",
        paragrafos: [
          "É fácil somar tudo que os clientes pagaram no mês e achar que esse número é o resultado da revenda. Mas esse valor inclui o custo do crédito comprado na plataforma pra manter cada tela ativa — e esse custo varia por plano: um cliente trimestral consome mais crédito de uma vez que um mensal, por exemplo.",
          "A conta que importa de verdade é: receita menos o custo de crédito de cada renovação. Só esse número mostra se a revenda está dando lucro de verdade ou só girando dinheiro.",
        ],
      },
      {
        titulo: "Margem por plano, não margem média",
        paragrafos: [
          "Plataformas diferentes têm custo de crédito diferente, e planos diferentes consomem créditos de forma diferente (um semestral trava mais crédito de uma vez que um mensal). Isso significa que a margem real pode variar bastante entre um cliente e outro, mesmo cobrando o mesmo valor — vale olhar plano por plano, não só a média geral do mês.",
        ],
      },
      {
        titulo: "O que incluir na conta além do crédito",
        paragrafos: [
          "Taxa de gateway de pagamento (quando o cliente paga por link/Pix com taxa), desconto dado em cupom de indicação, e o custo de aparelhos vendidos (quando a revenda também vende equipamento, não só assinatura) — tudo isso abate do que parece ser lucro bruto.",
          "Separar 'quanto entrou' de 'quanto sobrou depois de pagar o crédito e as taxas' é a diferença entre administrar a revenda por impressão e administrar por número de verdade.",
        ],
      },
    ],
  },
];

export function buscarGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}
