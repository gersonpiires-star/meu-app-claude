export const MODELOS_COBRANCA: Record<string, string> = {
  Lembrete:
    "Olá {nome}, tudo bem?\n\nPassando para lembrar que seu plano está chegando ao fim. 📅\n\nServiço: {app}\nPlano: {plano}\nVence em: {vencimento} ({prazo})\nValor da renovação: {valor}\n\nPara manter seu acesso sem interrupção, basta confirmar o pagamento pela chave abaixo. Assim que recebido, já faço a renovação.\n\nObrigado pela preferência!",
  Vencido:
    "Olá {nome}, tudo bem?\n\nSeu plano venceu e o acesso está suspenso no momento. ⚠️\n\nServiço: {app}\nVenceu em: {vencimento} ({prazo})\nValor da renovação: {valor}\n\nQuer seguir com a renovação? É só confirmar o pagamento pela chave abaixo e eu reativo na hora.\n\nSe precisar de qualquer ajuda, estou à disposição.",
  Renovação:
    "Olá {nome}, tudo bem?\n\nSua renovação do {app} foi confirmada com sucesso! ✅\n\nPlano: {plano}\nVálido até: {vencimento}\n\nObrigado pela preferência e pela confiança. Qualquer dúvida ou dificuldade com o aplicativo, é só me chamar aqui — estou à disposição.\n\nBoa diversão!",
};

export const MODELOS_COMUNICADO: Record<string, string> = {
  "Boas-vindas":
    "Olá {nome}, seja muito bem-vindo(a)!\n\nSeu acesso ao {app} já está ativo. Aqui vão os dados do seu plano:\n\n• Plano: {plano}\n• Valor: {valor}\n• Válido até: {vencimento}\n\nAlguns dias antes do vencimento eu te aviso por aqui, então não precisa se preocupar em lembrar da data.\n\nSe travar, sair do ar ou tiver qualquer dúvida sobre o aplicativo, é só me chamar neste número — atendo todos os dias.\n\nObrigado pela confiança e boa diversão!",
  "Aumento de plano":
    "Olá {nome}, tudo bem?\n\nPassando para avisar com antecedência que a partir da sua próxima renovação o plano {app} passará a custar {novoValor} (hoje {valor}).\n\nO reajuste acompanha o aumento do custo do serviço, e busquei manter o menor valor possível. Sua qualidade de atendimento e o suporte continuam os mesmos.\n\nQualquer dúvida estou à disposição. Obrigado pela confiança!",
  Manutenção:
    "Olá {nome}, tudo bem?\n\nInformo que o servidor do {app} passará por uma manutenção programada. Durante esse período o serviço pode oscilar por alguns minutos.\n\nNão é necessário fazer nada — assim que concluir, tudo volta ao normal automaticamente.\n\nQualquer problema depois disso, me chame que resolvo na hora. Obrigado pela compreensão!",
  Novidade:
    "Olá {nome}, tudo bem?\n\nBoa notícia: o {app} recebeu novos canais e melhorias na qualidade de transmissão.\n\nSe o aplicativo não mostrar as novidades, feche e abra novamente para atualizar a lista.\n\nAproveite! Qualquer dúvida estou à disposição.",
  Instabilidade:
    "Olá {nome}, tudo bem?\n\nIdentifiquei uma instabilidade no {app} e já estou acompanhando a correção junto ao servidor.\n\nSe estiver com dificuldade, tente fechar e abrir o aplicativo. Em breve normaliza.\n\nObrigado pela paciência — qualquer coisa me chame.",
  Livre: "",
};

export const MODELOS_PADRAO: Record<string, string> = { ...MODELOS_COBRANCA, ...MODELOS_COMUNICADO };

export function mesclarModelos(overrides: { chave: string; texto: string }[]): Record<string, string> {
  const mapa = { ...MODELOS_PADRAO };
  for (const o of overrides) {
    if (o.chave in mapa) mapa[o.chave] = o.texto;
  }
  return mapa;
}

export function preencherModelo(texto: string, dados: Record<string, string>): string {
  return texto.replace(/\{(\w+)\}/g, (match, chave) => dados[chave] ?? match);
}

// Número salvo como só DDD + telefone (10 ou 11 dígitos, sem o 55 do
// Brasil na frente) abre errado no WhatsApp — o wa.me interpreta os
// primeiros dígitos como código de país. Ex: "51999228258" (DDD 51 +
// celular) vira "+51 999 228 258" (Peru) em vez do número certo. Todo
// telefone BR sem código de país tem 10-11 dígitos; com código, 12-13 —
// então só falta completar quando tiver 11 dígitos ou menos.
function normalizarWhatsappBr(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length <= 11 ? `55${digitos}` : digitos;
}

export function linkWhatsApp(whatsapp: string, mensagem?: string): string {
  const numero = normalizarWhatsappBr(whatsapp);
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${numero}${texto}`;
}
