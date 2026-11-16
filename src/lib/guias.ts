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
  {
    slug: "clientes-que-atrasam-pagamento",
    titulo: "Como lidar com clientes que sempre pagam atrasado",
    resumo:
      "Antes de cortar o acesso, vale entender se é exatamente o mesmo tipo de atraso de sempre — porque a solução certa muda de caso para caso.",
    secoes: [
      {
        titulo: "Atraso não é tudo igual",
        paragrafos: [
          "Tem o cliente que esquece e paga rápido assim que é avisado, o que só paga depois de uma cobrança direta, e o que já demorou tanto que claramente não vai pagar essa renovação. Tratar os três do mesmo jeito — mandar a mesma mensagem, esperar o mesmo tempo — desperdiça energia com quem só precisava de um lembrete e dá corda demais pra quem já devia ter sido cortado.",
          "Vale olhar o histórico de cada cliente antes de decidir: quem sempre pagou em até 2 dias de atraso merece mais paciência do que quem só paga depois da terceira cobrança todo mês.",
        ],
      },
      {
        titulo: "O custo de manter o acesso ligado enquanto espera",
        paragrafos: [
          "Um detalhe que passa batido: enquanto o acesso continua ativo esperando o pagamento, o crédito da plataforma já foi consumido (ou vai ser, na próxima renovação) — esperar demais por um cliente que não vai pagar não é só receita perdida, é crédito gasto sem retorno.",
          "Isso muda a conta de 'quanto vale a pena esperar': pra quem paga com atraso mas sempre paga, esperar faz sentido. Pra quem historicamente não paga depois de sumir, suspender mais rápido limita o estrago.",
        ],
      },
      {
        titulo: "Defina a régua antes de precisar decidir no calor do momento",
        paragrafos: [
          "Decidir cliente a cliente, na hora, tende a puxar pro lado errado — ou corta rápido demais um cliente antigo que merecia mais prazo, ou segura demais um que já devia ter sido suspenso há dias. Definir com antecedência depois de quantos dias de atraso o acesso suspende automaticamente tira essa decisão do calor do momento e aplica a mesma régua pra todo mundo.",
          "Isso não substitui o bom senso pontual (um cliente antigo que avisou que vai atrasar por um motivo real ainda merece uma excepção manual) — só evita que o padrão seja decidir cada atraso do zero.",
        ],
      },
    ],
  },
  {
    slug: "quanto-cobrar-pelo-plano-de-streaming",
    titulo: "Quanto cobrar pelo plano de streaming: como calcular o preço certo",
    resumo:
      "Cobrar barato demais pra fechar a venda rápido é a forma mais comum de uma revenda trabalhar bastante e sobrar pouco no fim do mês.",
    secoes: [
      {
        titulo: "O preço mínimo é o custo, não o que parece justo",
        paragrafos: [
          "Antes de decidir quanto cobrar, é preciso saber quanto custa manter aquele cliente: o crédito da plataforma consumido por mês, mais a taxa do meio de pagamento usado (Pix costuma não ter taxa; cartão parcelado tem). Cobrar um valor 'que parece justo' sem essa conta na mão é decidir no escuro.",
          "Dois revendedores cobrando o mesmo preço podem ter margens bem diferentes se um deles paga mais caro pelo crédito — o preço certo depende do seu custo, não do preço do concorrente.",
        ],
      },
      {
        titulo: "Plano mais longo não é só 'mais barato por mês'",
        paragrafos: [
          "Um plano trimestral ou semestral trava o crédito da plataforma de uma vez só, no começo — diferente do mensal, que renova (e consome crédito de novo) todo mês. Dar um desconto grande no plano longo sem considerar isso pode deixar a margem por mês desse cliente pior que a do mensal, mesmo cobrando mais no total.",
          "Vale calcular a margem mês a mês de cada plano, não só o valor total recebido — é fácil um plano semestral 'parecer' mais vantajoso só porque o número total é maior.",
        ],
      },
      {
        titulo: "Preço parcelado no cartão custa mais caro pra quem vende",
        paragrafos: [
          "Quando o cliente paga parcelado no cartão, a taxa da maquininha sai de quem vende, não de quem compra — e essa taxa cresce com o número de parcelas. Se o preço não considerar isso, cada venda parcelada em mais vezes reduz a margem real sem que pareça, porque o preço anunciado foi o mesmo.",
          "Pix direto costuma ser a forma mais barata de receber, por isso muitas revendas oferecem um desconto pequeno pra quem paga assim — é repassar parte da economia da taxa, não só uma cortesia.",
        ],
      },
      {
        titulo: "Reajuste existe, e avisar com antecedência evita perder cliente por susto",
        paragrafos: [
          "Ligar o reajuste ao aumento real de custo (a plataforma subiu o preço do crédito) facilita explicar pro cliente e evita parecer um aumento arbitrário. Avisar com alguma antecedência, antes da cobrança chegar com o valor novo sem explicação, reduz bastante a chance de perder esse cliente por puro susto.",
        ],
      },
    ],
  },
  {
    slug: "controle-de-creditos-de-plataforma",
    titulo: "Controle de créditos: como não vender uma tela que você não tem",
    resumo:
      "Vender uma tela a mais do que o crédito disponível na plataforma não aparece como erro na hora — aparece dias depois, quando o cliente reclama que o acesso caiu.",
    secoes: [
      {
        titulo: "Crédito não é estoque físico, mas se comporta como um",
        paragrafos: [
          "Cada plano vendido consome uma fração do crédito da plataforma proporcional aos meses contratados — um semestral consome de uma vez o equivalente a 6 meses de um mensal. Perder essa conta de vista (vender sem checar se ainda tem saldo) é o jeito mais comum de ficar sem crédito bem no meio do mês, com clientes esperando renovação.",
          "A diferença pra um estoque físico é que o 'produto' aqui é invisível — não tem uma caixa vazia na estante avisando que acabou. Por isso vale acompanhar o saldo como um número de verdade, não por sensação.",
        ],
      },
      {
        titulo: "Múltiplas plataformas, múltiplos saldos",
        paragrafos: [
          "Quem trabalha com mais de um app/fornecedor de créditos precisa acompanhar o saldo de cada um separadamente — ter saldo sobrando numa plataforma não ajuda em nada um cliente cadastrado em outra. É comum, numa planilha única, esse controle por plataforma se perder e alguém vender achando que tinha saldo 'no geral'.",
        ],
      },
      {
        titulo: "O que fazer quando o saldo fica baixo antes da hora",
        paragrafos: [
          "Quando uma compra de crédito é feita fora do fluxo normal (negociação direta, bônus do fornecedor) e o saldo real não bate com o calculado pelo histórico, o certo é ajustar o saldo manualmente com uma observação do motivo — não tentar forçar o número lançando uma compra fictícia, que distorce o custo médio dali pra frente.",
          "O mais importante, de qualquer forma, é repor com antecedência: acompanhar o saldo semanalmente (não só quando já faltou) dá tempo de comprar mais crédito antes que um cliente fique esperando.",
        ],
      },
    ],
  },
];

export function buscarGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}
