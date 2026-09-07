#!/usr/bin/env python3
"""Gera public/manual-revendedor.pdf a partir do conteúdo definido neste script.

O PDF publicado não tinha nenhuma fonte editável no repositório (era um binário
estático) — esse script passa a ser a fonte. Pra editar o manual, mude o texto
nas listas abaixo (SECOES) e rode:

    pip install reportlab
    python3 scripts/gerar-manual-revendedor.py

Cores e fontes seguem os tokens de marca do app (src/app/globals.css).
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from datetime import datetime

PAGE_W, PAGE_H = A4
MARGIN = 56

# Tokens de marca (src/app/globals.css)
BG = HexColor("#0a2530")
BG_DEEP = HexColor("#032025")
SURFACE = HexColor("#123441")
BORDER = HexColor("#1a4152")
TEXT = HexColor("#e9f4f8")
TEXT_MUTED = HexColor("#9dbcc7")
TEXT_DIM = HexColor("#688e9b")
ACCENT = HexColor("#2ee6c5")
ACCENT_SOFT = HexColor("#0d3844")

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

style_intro = ParagraphStyle(
    "intro", fontName=FONT, fontSize=10.5, leading=15, textColor=TEXT_MUTED, alignment=TA_LEFT
)
style_bullet = ParagraphStyle(
    "bullet", fontName=FONT, fontSize=9.3, leading=13.4, textColor=TEXT_MUTED, alignment=TA_LEFT
)
style_bullet_bold = ParagraphStyle(
    "bullet_bold", parent=style_bullet, fontName=FONT_BOLD, textColor=TEXT
)
style_step = ParagraphStyle(
    "step", fontName=FONT, fontSize=9.6, leading=14, textColor=TEXT_MUTED, alignment=TA_LEFT
)


def draw_bg(c):
    c.setFillColor(BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def draw_footer(c, pagina):
    c.setFont(FONT, 8)
    c.setFillColor(TEXT_DIM)
    c.drawString(MARGIN, 32, "GestorPro — uso interno")
    c.drawRightString(PAGE_W - MARGIN, 32, f"Página {pagina}")
    c.setStrokeColor(BORDER)
    c.setLineWidth(0.6)
    c.line(MARGIN, 46, PAGE_W - MARGIN, 46)


def draw_header(c, secao):
    c.setFillColor(ACCENT)
    c.rect(MARGIN, PAGE_H - 52, 3, 14, fill=1, stroke=0)
    c.setFont(FONT_BOLD, 8.4)
    c.setFillColor(TEXT_DIM)
    c.drawString(MARGIN + 12, PAGE_H - 48, f"GESTORPRO   ·   {secao.upper()}")
    c.setStrokeColor(BORDER)
    c.line(MARGIN, PAGE_H - 60, PAGE_W - MARGIN, PAGE_H - 60)


def draw_title(c, titulo, numero=None, y=PAGE_H - 100):
    if numero:
        cx, cy, r = MARGIN + 16, y, 16
        c.setFillColor(ACCENT_SOFT)
        c.circle(cx, cy, r, fill=1, stroke=0)
        c.setStrokeColor(ACCENT)
        c.setLineWidth(1.1)
        c.circle(cx, cy, r, fill=0, stroke=1)
        c.setFont(FONT_BOLD, 10.5)
        c.setFillColor(ACCENT)
        c.drawCentredString(cx, cy - 3.6, numero)
        text_x = MARGIN + 44
    else:
        text_x = MARGIN
    c.setFont(FONT_BOLD, 18)
    c.setFillColor(TEXT)
    c.drawString(text_x, y - 6, titulo)
    return text_x


def draw_paragraph(c, texto, x, y, width, style):
    p = Paragraph(texto, style)
    w, h = p.wrap(width, 400)
    p.drawOn(c, x, y - h)
    return y - h


def draw_bullets(c, itens, x, y, width, gap_titulo=3, gap_item=9):
    """itens: lista de (titulo|None, texto). Se titulo, desenha 'Título — texto'
    com o título em negrito, senão o texto sozinho (parágrafo livre)."""
    cy = y
    for titulo, texto in itens:
        c.setFillColor(ACCENT)
        c.setFont(FONT_BOLD, 9.3)
        c.drawString(x, cy - 9, "›")
        corpo = f"<b>{titulo}</b> — {texto}" if titulo else texto
        cy = draw_paragraph(c, corpo, x + 12, cy, width - 12, style_bullet) - gap_item
    return cy


def draw_columns(c, esquerda, direita, x, y, col_width, gutter=18):
    y_e = draw_bullets(c, esquerda, x, y, col_width)
    y_d = draw_bullets(c, direita, x + col_width + gutter, y, col_width)
    return min(y_e, y_d)


def draw_note(c, texto, x, y, width):
    p = Paragraph(texto, ParagraphStyle("note", parent=style_bullet, textColor=TEXT_MUTED))
    w, h = p.wrap(width - 24, 300)
    label_y = y - 18  # baseline do rótulo "IMPORTANTE"
    paragrafo_top = label_y - 12  # topo do parágrafo, com respiro abaixo do rótulo
    box_h = (y - paragrafo_top) + h + 12  # do topo da caixa até abaixo do parágrafo
    c.setFillColor(SURFACE)
    c.roundRect(x, y - box_h, width, box_h, 6, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.setFont(FONT_BOLD, 8)
    c.drawString(x + 12, label_y, "IMPORTANTE")
    p.drawOn(c, x + 12, paragrafo_top - h)
    return y - box_h


# ---------------------------------------------------------------------------
# Conteúdo
# ---------------------------------------------------------------------------

SUMARIO = [
    ("INTRODUÇÃO", None),
    ("O que é o GestorPro", "03"),
    ("Primeiros passos e segurança", "04"),
    ("PAINEL DO REVENDEDOR", None),
    ("Painel (visão geral do mês)", "05"),
    ("Clientes — lista e ações em lote", "06"),
    ("Cadastrar um cliente", "07"),
    ("Detalhe e edição do cliente", "08"),
    ("Cobrança e renovação", "09"),
    ("Interessados (leads)", "10"),
    ("Vendas de aparelhos", "11"),
    ("Estoque", "12"),
    ("Plataformas de crédito", "13"),
    ("Precificação (maquininha)", "15"),
    ("Relatório financeiro", "16"),
    ("Configurações da conta", "17"),
    ("Funcionários (sub-contas)", "19"),
    ("Modelos de mensagem", "20"),
    ("Histórico de ações", "21"),
    ("Notificações (sininho)", "22"),
    ("Sua assinatura do GestorPro", "23"),
    ("Instalando no celular (PWA)", "24"),
]


def pagina_capa(c):
    draw_bg(c)
    c.setFillColor(ACCENT_SOFT)
    c.circle(PAGE_W / 2, PAGE_H / 2 + 140, 34, fill=1, stroke=0)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(1.4)
    c.circle(PAGE_W / 2, PAGE_H / 2 + 140, 34, fill=0, stroke=1)
    c.setFont(FONT_BOLD, 22)
    c.setFillColor(ACCENT)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 132, "G")

    c.setFont(FONT_BOLD, 30)
    c.setFillColor(TEXT)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 70, "MANUAL DO REVENDEDOR")
    c.setFont(FONT_BOLD, 15)
    c.setFillColor(ACCENT)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 44, "GestorPro")

    p = Paragraph(
        "Guia completo do painel que você usa no dia a dia da sua revenda de planos de streaming.",
        ParagraphStyle("sub", fontName=FONT, fontSize=11.5, leading=16, textColor=TEXT_MUTED, alignment=1),
    )
    w, h = p.wrap(340, 100)
    p.drawOn(c, PAGE_W / 2 - 170, PAGE_H / 2 - 20 - h)

    tags = ["Clientes", "Cobrança e renovação", "Financeiro"]
    tx = PAGE_W / 2 - 140
    for t in tags:
        c.setFont(FONT_BOLD, 8.5)
        tw = c.stringWidth(t, FONT_BOLD, 8.5) + 20
        c.setFillColor(SURFACE)
        c.roundRect(tx, PAGE_H / 2 - 80, tw, 20, 10, fill=1, stroke=0)
        c.setFillColor(ACCENT)
        c.drawCentredString(tx + tw / 2, PAGE_H / 2 - 74, t)
        tx += tw + 10

    c.setFont(FONT, 9)
    c.setFillColor(TEXT_DIM)
    hoje = datetime.now().strftime("%d de %B de %Y")
    meses_pt = {
        "January": "janeiro", "February": "fevereiro", "March": "março", "April": "abril",
        "May": "maio", "June": "junho", "July": "julho", "August": "agosto",
        "September": "setembro", "October": "outubro", "November": "novembro", "December": "dezembro",
    }
    for en, pt in meses_pt.items():
        hoje = hoje.replace(en, pt)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 - 160, f"Documento gerado em {hoje}")
    c.showPage()


def pagina_sumario(c):
    draw_bg(c)
    draw_header(c, "Sumário")
    draw_title(c, "Sumário", y=PAGE_H - 100)
    p = Paragraph("Onde encontrar cada função dentro deste manual", style_intro)
    w, h = p.wrap(PAGE_W - 2 * MARGIN, 40)
    p.drawOn(c, MARGIN, PAGE_H - 128 - h)

    y = PAGE_H - 160
    for titulo, pagina in SUMARIO:
        if pagina is None:
            y -= 6
            c.setFont(FONT_BOLD, 9)
            c.setFillColor(ACCENT)
            c.drawString(MARGIN, y, titulo)
            y -= 16
            continue
        c.setFont(FONT, 10)
        c.setFillColor(TEXT_MUTED)
        c.drawString(MARGIN + 10, y, titulo)
        c.setFillColor(TEXT_DIM)
        dots_w = PAGE_W - 2 * MARGIN - c.stringWidth(titulo, FONT, 10) - 40
        c.setFont(FONT_BOLD, 10)
        c.setFillColor(TEXT)
        c.drawRightString(PAGE_W - MARGIN, y, pagina)
        y -= 16

    draw_footer(c, 2)
    c.showPage()


def pagina_conteudo(c, pagina_num, secao, titulo, numero, intro, esquerda, direita=None, nota=None, y_bullets=None):
    draw_bg(c)
    draw_header(c, secao)
    text_x = draw_title(c, titulo, numero)
    y = PAGE_H - 128
    y = draw_paragraph(c, intro, MARGIN, y, PAGE_W - 2 * MARGIN, style_intro) - 22

    col_width = (PAGE_W - 2 * MARGIN - 18) / 2
    if direita is not None:
        y = draw_columns(c, esquerda, direita, MARGIN, y, col_width)
    else:
        y = draw_bullets(c, esquerda, MARGIN, y, PAGE_W - 2 * MARGIN)

    if nota:
        draw_note(c, nota, MARGIN, y - 14, PAGE_W - 2 * MARGIN)

    draw_footer(c, pagina_num)
    c.showPage()


def main():
    c = canvas.Canvas("public/manual-revendedor.pdf", pagesize=A4)

    pagina_capa(c)
    pagina_sumario(c)

    pagina_conteudo(
        c, 3, "Introdução", "O que é o GestorPro", None,
        "O GestorPro é o sistema de gestão para quem revende acesso a aplicativos de streaming — "
        "pensado para organizar clientes, controlar vencimentos, registrar vendas de aparelhos e "
        "mostrar exatamente quanto entra e quanto sai todo mês.",
        esquerda=[
            (None, "<b>Como o sistema se organiza</b>"),
            (None, "Clientes — o cadastro central; tudo (cobrança, renovação, relatório) parte daqui."),
            (None, "Financeiro — vendas de aparelhos, estoque, plataformas de crédito e o relatório mês a mês."),
            (None, "Configurações — dados da conta, formas de recebimento, equipe e modelos de mensagem."),
        ],
        direita=[
            (None, "<b>Este manual cobre</b>"),
            (None, "Cadastro de clientes, cobrança e renovação — inclusive em lote."),
            (None, "Vendas de aparelhos, controle de estoque e plataformas de crédito."),
            (None, "Relatório financeiro, precificação e configurações da conta."),
            (None, "Sua própria assinatura do GestorPro e instalação no celular."),
        ],
    )

    pagina_conteudo(
        c, 4, "Introdução", "Primeiros passos e segurança", None,
        "Como criar a conta, entrar no sistema e manter o acesso protegido.",
        esquerda=[
            (None, "<b>Cadastro e período de teste</b>"),
            (None, "Toda conta nova começa com um período de teste grátis, sem precisar cadastrar cartão."),
            (None, "Durante o teste, todas as funções do sistema ficam liberadas normalmente."),
            (None, "Ao final do teste, é preciso assinar um dos planos para continuar com acesso."),
            (None, "Quem se cadastra por um link de indicação de outro revendedor fica vinculado a ele automaticamente."),
        ],
        direita=[
            (None, "<b>Segurança da conta</b>"),
            (None, "Sessão por dispositivo — cada computador ou celular novo exige login e senha."),
            (None, "Saída automática por inatividade — depois de alguns minutos sem uso, o sistema desloga sozinho."),
            (None, "Bloqueio contra tentativas repetidas — o login trava temporariamente após senhas erradas seguidas."),
        ],
        nota="Instale o GestorPro na tela inicial do celular para usar como um aplicativo de verdade, com ícone próprio e sem a barra de endereço do navegador.",
    )

    pagina_conteudo(
        c, 5, "Painel do revendedor", "Painel — visão geral do mês", "01",
        "A primeira tela ao entrar no sistema. Mostra de forma rápida como está o mês: quanto entrou, "
        "quanto está vencendo e quem precisa de atenção agora.",
        esquerda=[
            (None, "<b>O que aparece aqui</b>"),
            (None, "Entrou no mês — soma de renovações e vendas de aparelhos, com o custo e o lucro já calculados."),
            (None, "Clientes ativos, vencendo, vencidos e créditos — quatro números-chave num só olhar."),
            (None, "Interessados pra retornar — leads que pediram pra você chamar de novo numa data específica."),
            (None, "Vencendo / vencidos — atalho direto pra cobrar ou renovar sem abrir a lista completa de clientes."),
        ],
        direita=[
            (None, "<b>Atalhos no topo</b>"),
            (None, "Novo interessado, Novo cliente e Nova venda ficam sempre à mão."),
            (None, "O sino no topo mostra comunicados da Administração GestorPro e avisos de pagamento recebido pelo link."),
        ],
    )

    pagina_conteudo(
        c, 6, "Painel do revendedor", "Clientes — lista e ações em lote", "02",
        "A lista central de todos os seus clientes, organizada em abas por situação, com ações em massa "
        "pra economizar tempo.",
        esquerda=[
            (None, "<b>Abas</b>"),
            (None, "Todos / Ativos / Precisa de atenção (vencidos ou vencendo em poucos dias) / Cancelados / Interessados."),
            (None, "Cada linha mostra cliente, WhatsApp, plano e app, vencimento, valor e status colorido."),
        ],
        direita=[
            (None, "<b>Ações em lote (topo da tela)</b>"),
            (None, "Cobrar em lote — manda a cobrança pra vários clientes vencendo de uma vez."),
            (None, "Renovar em lote — renova de uma vez todos que pagaram, mantendo o plano de cada um."),
            (None, "Aviso em massa — envia um comunicado pra todos os clientes de um app específico."),
        ],
    )

    pagina_conteudo(
        c, 7, "Painel do revendedor", "Cadastrar um cliente novo", "03",
        "Formulário completo de cadastro — os únicos campos obrigatórios são nome, plano e valor; o "
        "resto é opcional e pode ser preenchido depois.",
        esquerda=[
            (None, "<b>Campos principais</b>"),
            (None, "Serviço/app — digite o nome do app; se ainda não existir, o sistema cria automaticamente."),
            (None, "Telas — quantidade de telas simultâneas contratadas."),
            (None, "Plano e valor — mensal, dois meses, trimestral ou semestral; o vencimento é calculado sozinho."),
            (None, "Dia fixo de vencimento (opcional) — trava a renovação sempre no mesmo dia do mês."),
        ],
        direita=[
            (None, "<b>Outros campos</b>"),
            (None, "Teste grátis — marca o cliente como cortesia temporária, sem cobrar ainda."),
            (None, "Indicado por — vincula esse cliente a quem o indicou."),
            (None, "Anotação — campo livre para observações internas."),
        ],
    )

    pagina_conteudo(
        c, 8, "Painel do revendedor", "Detalhe e edição do cliente", "04",
        "Ao abrir um cliente, você vê o histórico completo dele: renovações, vendas de aparelho, valor "
        "total gerado (LTV) e pode editar qualquer dado a qualquer momento.",
        esquerda=[
            (None, "<b>O que você consegue fazer aqui</b>"),
            (None, "Editar dados cadastrais, aplicar reajuste de preço e corrigir o vencimento manualmente."),
            (None, "Ver o valor total que o cliente já gerou (renovações + aparelhos comprados)."),
            (None, "Cancelar o cliente, registrando o motivo da saída — sem excluir o histórico."),
            (None, "Reativar um cliente cancelado — se ele voltar a pagar, uma renovação normal já volta o cadastro pra ativo."),
            (None, "Acompanhar indicações: quem esse cliente indicou pra você."),
        ],
    )

    pagina_conteudo(
        c, 9, "Painel do revendedor", "Cobrança e renovação", "05",
        "Monta a mensagem de cobrança automaticamente a partir de modelos prontos (editáveis), com a "
        "opção de anexar uma chave Pix ou um link de pagamento online.",
        esquerda=[
            (None, "<b>Modelos de mensagem</b>"),
            (None, "Lembrete, Vencido, Renovação, Boas-vindas, Aumento de plano, Manutenção, Instabilidade ou uma mensagem Livre."),
            (None, "Cada modelo já preenche sozinho o nome do cliente, plano, vencimento e valor."),
        ],
        direita=[
            (None, "<b>Anexar na mensagem</b>"),
            (None, "Chave Pix cadastrada em Configurações."),
            (None, "Link de pagamento (Mercado Pago) — se você configurou suas credenciais próprias, o cliente paga sozinho (Pix ou cartão) e a renovação é registrada automaticamente."),
        ],
        nota="Renovação pode ser feita com um clique (mantendo o plano atual) na lista de clientes, ou com plano/valor personalizados aqui no detalhe do cliente — o custo do crédito é calculado sozinho a partir do app vinculado em Plataformas.",
    )

    pagina_conteudo(
        c, 10, "Painel do revendedor", "Interessados — leads que ainda não viraram cliente", "06",
        "Uma agenda de pessoas interessadas nos seus serviços, com data de retorno, pra você nunca "
        "esquecer de chamar alguém de volta.",
        esquerda=[
            (None, "<b>Como funciona</b>"),
            (None, "Cadastre nome, WhatsApp, o que a pessoa tem interesse e uma data pra retornar o contato."),
            (None, "Sem WhatsApp na hora do cadastro? Edite o interessado depois pra completar o telefone."),
            (None, "Quem está com retorno pra hoje ou atrasado aparece destacado no Painel automaticamente."),
            (None, "Ao clicar em \"Virar cliente\", você preenche o cadastro completo — só depois de salvar é que o lead sai de Interessados. Se desistir no meio do caminho, ele continua na lista."),
        ],
    )

    pagina_conteudo(
        c, 11, "Painel do revendedor", "Vendas de aparelhos", "07",
        "Registro de cada venda de equipamento (TV Box, Smart Stick etc.), vinculada ou não a um "
        "cliente, com recibo em PDF automático.",
        esquerda=[
            (None, "<b>Cada venda registra</b>"),
            (None, "Produto, quantidade, valor cobrado e forma de pagamento."),
            (None, "Se vinculada a um cliente, o WhatsApp já sugere a mensagem com o recibo."),
        ],
        direita=[
            (None, "O recibo em PDF é gerado automaticamente e pode ser baixado ou compartilhado direto pelo celular."),
            (None, "Vendas sem cliente vinculado podem ser associadas a um cliente depois, a qualquer momento."),
        ],
    )

    pagina_conteudo(
        c, 12, "Painel do revendedor", "Estoque", "08",
        "Controle de entradas e saídas de aparelhos, com custo médio calculado automaticamente e "
        "alerta de estoque mínimo.",
        esquerda=[
            (None, "<b>Como funciona</b>"),
            (None, "Toda venda dá baixa automática no estoque — o sistema não deixa vender se não tiver aparelho disponível."),
            (None, "O lucro reportado no Relatório usa o custo real de compra de cada aparelho (FIFO), não uma média chutada."),
            (None, "Defina um estoque mínimo por produto pra receber um aviso quando estiver acabando."),
        ],
    )

    pagina_conteudo(
        c, 13, "Painel do revendedor", "Plataformas — fornecedores de crédito", "09",
        "Cada fornecedor de crédito (o \"painel\" onde você compra os créditos dos apps que revende) "
        "tem seu saldo controlado aqui, junto com os apps vinculados a ele.",
        esquerda=[
            (None, "<b>Por plataforma</b>"),
            (None, "Saldo atual, créditos comprados, créditos usados e o valor total investido."),
            (None, "Histórico de cada lote de créditos comprado, com opção de corrigir se digitou a quantidade errada."),
            (None, "Apps vinculados a essa plataforma, com o preço do crédito e a taxa de tela extra de cada um."),
        ],
        nota="A renovação de um cliente é bloqueada automaticamente se a plataforma do app dele estiver sem créditos disponíveis — isso evita ficar devendo crédito pro fornecedor sem perceber.",
    )

    pagina_conteudo(
        c, 14, "Painel do revendedor", "Plataformas — cadastro passo a passo", "09",
        "Veja como organizar do zero: criar o fornecedor, lançar os créditos comprados e vincular os "
        "apps que você revende com ele.",
        esquerda=[
            ("Criar a plataforma", "em Plataformas, toque em “Nova plataforma” e dê um nome pro fornecedor — o saldo mínimo de alerta é opcional."),
            ("Lançar um lote de créditos", "dentro da plataforma, informe a quantidade comprada e o valor pago; o saldo e o custo médio por crédito são calculados sozinhos."),
            ("Cadastrar um app na plataforma", "toque em “Novo app”, informe o nome (ex: NetFlex TV) e o custo do crédito daquele app — ele já fica vinculado à plataforma."),
        ],
        direita=[
            ("Vincular clientes ao app", "no cadastro (ou edição) do cliente, escolha o mesmo nome de app no campo “Serviço” — cada renovação desse cliente passa a descontar um crédito da plataforma."),
            ("Corrigir ou mover um app", "dentro de cada app, dá pra trocar a plataforma vinculada, o custo do crédito e a cobrança de tela extra a qualquer momento."),
            ("Excluir uma plataforma lançada errada", "toque em “Excluir” no card dela — só é permitido se nenhum cliente estiver usando um app vinculado, pra nunca perder o controle de crédito de alguém já ativo."),
        ],
    )

    pagina_conteudo(
        c, 15, "Painel do revendedor", "Precificação — calculadora de maquininha", "10",
        "Calculadora rápida para descobrir o preço de venda de um aparelho considerando a margem de "
        "lucro desejada e as taxas de parcelamento da sua maquininha.",
        esquerda=[
            (None, "<b>Como usar</b>"),
            (None, "Informe o custo do aparelho e a margem de lucro desejada (em %)."),
            (None, "O sistema mostra o preço à vista e a tabela de valores parcelados, já descontando a taxa da maquininha."),
            (None, "A tabela de taxas é só uma referência de mercado — edite cada parcela pra bater com o extrato real da sua maquininha; a margem padrão e as taxas personalizadas ficam salvas pra próxima vez."),
        ],
    )

    pagina_conteudo(
        c, 16, "Painel do revendedor", "Relatório financeiro", "11",
        "O resumo financeiro completo do seu negócio, mês a mês: entradas, custos, lucro real e a "
        "evolução ao longo do tempo.",
        esquerda=[
            (None, "<b>O que o relatório mostra</b>"),
            (None, "Entradas separadas por renovação e por venda de aparelho."),
            (None, "Custo real (créditos das plataformas + custo dos aparelhos vendidos) e o lucro líquido do período."),
            (None, "Gráfico de entradas e saídas mês a mês, pra acompanhar a evolução do negócio."),
            (None, "Fechamento de mês automático, guardando o histórico permanentemente."),
        ],
    )

    pagina_conteudo(
        c, 17, "Painel do revendedor", "Configurações da conta (1/2)", "12",
        "Seus dados pessoais e as formas de recebimento de pagamento configuradas na sua própria conta.",
        esquerda=[
            (None, "<b>Seus dados</b>"),
            (None, "Nome e WhatsApp usados nas mensagens e no cadastro da conta."),
        ],
        direita=[
            (None, "<b>Receber pagamentos online (Mercado Pago)</b>"),
            (None, "Cole aqui o Access Token da sua própria conta do Mercado Pago — o dinheiro cai direto pra você."),
            (None, "Depois de configurado, a opção de link de pagamento passa a aparecer na tela de Cobrança de cada cliente."),
        ],
    )

    pagina_conteudo(
        c, 18, "Painel do revendedor", "Configurações da conta (2/2)", "12",
        "Chaves Pix para anexar nas cobranças e as ferramentas de backup dos seus dados.",
        esquerda=[
            (None, "<b>Chaves Pix</b>"),
            (None, "Cadastre uma ou mais chaves (CPF, celular, e-mail, aleatória) pra anexar direto na mensagem de cobrança."),
        ],
        direita=[
            (None, "<b>Backup e exportação</b>"),
            (None, "Exporte um arquivo de backup completo dos seus dados a qualquer momento, e restaure se precisar."),
            (None, "Exportação em CSV pra abrir seus dados numa planilha."),
        ],
    )

    pagina_conteudo(
        c, 19, "Painel do revendedor", "Funcionários — sub-contas da sua equipe", "13",
        "Dê acesso ao sistema pra quem trabalha com você, sem precisar compartilhar sua própria senha.",
        esquerda=[
            (None, "<b>Como funciona</b>"),
            (None, "Cada funcionário tem login próprio e acessa os mesmos dados da sua conta."),
            (None, "Ações sensíveis — editar histórico financeiro já lançado, mexer nas credenciais de pagamento ou gerenciar a equipe — ficam só com você."),
            (None, "Desativar um funcionário revoga o acesso imediatamente, mesmo com sessão aberta em outro aparelho."),
        ],
    )

    pagina_conteudo(
        c, 20, "Painel do revendedor", "Modelos de mensagem", "14",
        "Todos os textos usados nas cobranças e avisos automáticos ficam aqui, prontos pra você "
        "personalizar do seu jeito.",
        esquerda=[
            (None, "<b>O que dá pra editar</b>"),
            (None, "Cada modelo (Lembrete, Vencido, Renovação, Boas-vindas etc.) usa variáveis como nome do cliente, plano, vencimento e valor, preenchidas sozinhas na hora de enviar."),
            (None, "Alterações ficam salvas na sua conta e valem pra todos os clientes a partir daí."),
        ],
    )

    pagina_conteudo(
        c, 21, "Painel do revendedor", "Histórico de ações", "15",
        "Um registro de auditoria de tudo que acontece na conta — quem fez o quê e quando, incluindo "
        "ações da sua equipe.",
        esquerda=[
            (None, "<b>Para que serve</b>"),
            (None, "Rastrear correções feitas em lançamentos financeiros já registrados."),
            (None, "Conferir ações de funcionários, com data e hora."),
            (None, "Serve como registro caso algum valor precise ser conferido depois."),
        ],
    )

    pagina_conteudo(
        c, 22, "Painel do revendedor", "Notificações — o sininho do painel", "16",
        "O ícone de sino, no topo do painel, avisa sobre eventos importantes sem você precisar ficar "
        "conferindo manualmente.",
        esquerda=[
            (None, "<b>O que aparece no sino</b>"),
            (None, "Comunicados — avisos e novidades publicados pela Administração GestorPro pra todos os revendedores (ou só pra você, quando for um aviso direcionado)."),
            (None, "Pagamento recebido — quando um cliente paga sozinho pelo link de autoatendimento, você recebe um aviso na hora."),
            (None, "O número vermelho mostra quantas notificações ainda não foram vistas; abrir o sino marca tudo como lido."),
        ],
    )

    pagina_conteudo(
        c, 23, "Painel do revendedor", "Sua assinatura do GestorPro", "17",
        "A tela onde você assina ou renova o próprio acesso ao sistema, com pagamento via Mercado "
        "Pago.",
        esquerda=[
            (None, "<b>Planos</b>"),
            (None, "Mensal, semestral ou anual — quanto mais longo o plano, maior o desconto no valor mensal."),
            (None, "Os preços e descontos atuais de cada plano aparecem sempre atualizados direto na tela de Assinatura — não fique preso a um valor impresso aqui."),
            (None, "Pagamento via Pix (QR Code ou copia e cola) ou cartão, direto pelo Mercado Pago, ou por Pix pelo WhatsApp com o suporte."),
        ],
        nota="Se o pagamento não confirmar, você recebe um aviso por notificação push com um link direto pra tentar de novo — e se o acesso ficar vencido, seus dados continuam guardados intactos, prontos assim que você renovar.",
    )

    pagina_conteudo(
        c, 24, "Painel do revendedor", "Instalando no celular (PWA)", "18",
        "O GestorPro funciona como um aplicativo de verdade quando instalado — ícone na tela inicial, "
        "tela cheia, sem a barra do navegador.",
        esquerda=[
            (None, "<b>Como instalar</b>"),
            (None, "No celular, abra o GestorPro pelo navegador e toque em “Adicionar à tela inicial” (Android) ou no menu de compartilhamento do iPhone."),
            (None, "O ícone fica salvo no celular como qualquer outro aplicativo, com notificações e uso em tela cheia."),
        ],
    )

    # Página final
    draw_bg(c)
    c.setFont(FONT_BOLD, 20)
    c.setFillColor(TEXT)
    c.drawCentredString(PAGE_W / 2, PAGE_H / 2 + 40, "Obrigado por usar o GestorPro")
    p = Paragraph(
        "Este manual cobre todas as funções do painel do revendedor disponíveis no sistema até a data "
        "de geração deste documento. O GestorPro está em evolução constante — novidades são "
        "anunciadas pelo sino de notificações do painel e nos Comunicados da Administração.<br/><br/>"
        "Dúvidas? Fale com o suporte pelo WhatsApp direto na tela de Assinatura do sistema.",
        ParagraphStyle("final", fontName=FONT, fontSize=11, leading=17, textColor=TEXT_MUTED, alignment=1),
    )
    w, h = p.wrap(380, 200)
    p.drawOn(c, PAGE_W / 2 - 190, PAGE_H / 2 - h)
    c.showPage()

    c.save()
    print("Gerado: public/manual-revendedor.pdf")


if __name__ == "__main__":
    main()
