#!/usr/bin/env python3
"""Aplica edições pontuais no manual do revendedor, preservando o layout,
as imagens e o design originais — não redesenha nada.

Fonte: scripts/manual-revendedor-original.pdf (o PDF publicado antes desta
edição, guardado aqui pra qualquer ajuste futuro poder partir sempre do
mesmo original em vez de acumular edição sobre edição).

Edições aplicadas:
  1. Pág. 22 (Sua assinatura) — remove o bullet "Anual — paga o equivalente
     a 10 meses e ganha 12 (2 meses de bônus)." (valor fixo que fica
     desatualizado) e sobe o restante do texto pra fechar o espaço.
  2. Pág. 14 (Precificação) — adiciona um 4º bullet reforçando que agora dá
     pra cadastrar/editar a taxa de cada parcela.

Rodar: pip install pypdf reportlab && python3 scripts/editar-manual-revendedor.py
"""

import io
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import Color, white

ORIGINAL = "scripts/manual-revendedor-original.pdf"
SAIDA = "public/manual-revendedor.pdf"

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

COR_CORPO = Color(0.0863, 0.1961, 0.2314)
COR_LABEL = Color(0.0392, 0.1451, 0.1882)
COR_ACCENT = Color(0.0588, 0.549, 0.4706)
COR_NOTE_BG = Color(0.949, 0.9725, 0.9686)


def y(top, page_h):
    """Converte 'top' (pdfplumber, origem no canto superior) pra y do
    reportlab (origem no canto inferior)."""
    return page_h - top


IMG_TOPO = "scripts/manual-assinatura-topo.png"
COR_BORDA = Color(0.8588, 0.9059, 0.902)


def overlay_pagina22(page_w, page_h):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))

    # 1) Apaga tudo a partir do rodapé da barra de título do print (top 192,
    # que fica igual) até o fim da caixa de nota original (top ~662): o print
    # inteiro, a borda do frame, "Planos"/"Mensal"/"Anual", o bullet do Pix e
    # a caixa de nota — tudo isso é redesenhado deslocado pra cima abaixo.
    c.setFillColor(white)
    c.rect(0, y(662, page_h), page_w, 662 - 192, fill=1, stroke=0)

    # 2) Redesenha o print cortado (sem os cards de preço) na mesma largura e
    # posição X do original, só mais baixo. A imagem fonte já foi recortada
    # (scripts/manual-assinatura-topo.png, 1440x440 dos 1440x900 originais)
    # mantendo a largura cheia, então a altura em pt escala na mesma proporção.
    img_x, img_top, img_w = 45.75, 192.0, 503.25
    img_h = img_w * (440 / 1440)
    img_bottom = img_top + img_h
    c.drawImage(IMG_TOPO, img_x, y(img_bottom, page_h), width=img_w, height=img_h, preserveAspectRatio=False, mask="auto")

    # 3) Redesenha o contorno do frame (mesmo topo, unido ao topo já existente
    # da barra de título) terminando agora no novo rodapé, mais curto.
    borda_bottom = img_bottom + 0.37
    c.setStrokeColor(COR_BORDA)
    c.setLineWidth(0.75)
    c.rect(45.37, y(borda_bottom, page_h), 549.37 - 45.37, borda_bottom - 175.12, fill=0, stroke=1)

    DESLOC_IMG = 506.62 - borda_bottom  # ~160.5pt — sobe tudo que dependia da altura do print
    DESLOC_BULLET = 577.7 - 558.9  # 18.8pt — sobe o que ficava abaixo do bullet "Anual" removido

    # 4) "Planos" e o bullet "Mensal" só dependem do corte do print.
    c.setFont(FONT_BOLD, 10.5)
    c.setFillColor(COR_LABEL)
    c.drawString(45.4, y(522.7 - DESLOC_IMG, page_h), "Planos")

    c.setFont(FONT_BOLD, 9.3)
    c.setFillColor(COR_ACCENT)
    c.drawString(45.4, y(539.4 - DESLOC_IMG, page_h), "›")
    c.setFillColor(COR_LABEL)
    c.drawString(56.7, y(539.4 - DESLOC_IMG, page_h), "Mensal")
    largura_mensal = c.stringWidth("Mensal ", FONT_BOLD, 9.3)
    c.setFont(FONT, 9.3)
    c.setFillColor(COR_CORPO)
    c.drawString(56.7 + largura_mensal, y(539.4 - DESLOC_IMG, page_h), "— cobrança recorrente todo mês, cancele quando quiser.")

    # 5) O bullet "Anual" continua removido — o que vinha depois dele soma os
    # dois deslocamentos (corte do print + fechamento do espaço do bullet).
    DESLOC = DESLOC_IMG + DESLOC_BULLET
    c.setFont(FONT_BOLD, 9.3)
    c.setFillColor(COR_ACCENT)
    c.drawString(45.4, y(577.7 - DESLOC + 8.5, page_h), "›")
    c.setFont(FONT, 9.3)
    c.setFillColor(COR_CORPO)
    c.drawString(
        56.7,
        y(577.7 - DESLOC + 8.5, page_h),
        "Pagamento via Pix (QR Code ou copia e cola) ou cartão, direto pelo Mercado Pago, ou por Pix pelo WhatsApp com o",
    )
    c.drawString(56.7, y(591.2 - DESLOC + 8.5, page_h), "suporte.")

    # 6) Redesenha a caixa de nota, deslocada pra cima em DESLOC.
    # roundRect usa (x, y, width, height) com y = canto inferior esquerdo.
    box_top = 617.2 - DESLOC
    box_bottom = 657.7 - DESLOC
    c.setFillColor(COR_NOTE_BG)
    c.roundRect(46.1, y(box_bottom, page_h), 549.7 - 46.1, box_bottom - box_top, 4, fill=1, stroke=0)
    c.setFillColor(COR_ACCENT)
    c.rect(45.0, y(657.7 - DESLOC, page_h), 2.2, 40.5, fill=1, stroke=0)

    c.setFont(FONT_BOLD, 8.8)
    c.setFillColor(COR_ACCENT)
    c.drawString(58.9, y(627.6 - DESLOC + 8, page_h), "Se o pagamento não confirmar")
    largura_bold = c.stringWidth("Se o pagamento não confirmar ", FONT_BOLD, 8.8)
    c.setFont(FONT, 8.8)
    c.setFillColor(COR_CORPO)
    c.drawString(
        58.9 + largura_bold,
        y(627.6 - DESLOC + 8, page_h),
        "— você recebe um aviso por notificação push com um link direto pra tentar de novo — e",
    )
    c.drawString(
        58.9,
        y(640.3 - DESLOC + 8, page_h),
        "se o acesso ficar vencido, seus dados continuam guardados intactos, prontos assim que você renovar.",
    )

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def overlay_pagina14(page_w, page_h):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))

    novo_top = 580.7 + (580.7 - 561.9)  # mesma cadência dos bullets acima (~18.8pt)
    c.setFont(FONT_BOLD, 9.3)
    c.setFillColor(COR_ACCENT)
    c.drawString(45.4, y(novo_top + 8.5, page_h), "›")
    c.setFont(FONT, 9.3)
    c.setFillColor(COR_CORPO)
    c.drawString(
        56.7,
        y(novo_top + 8.5, page_h),
        "As taxas agora podem ser cadastradas por você: edite o valor de cada parcela pra bater com o que",
    )
    c.drawString(
        56.7,
        y(novo_top + 8.5 + 13.3, page_h),
        "sua maquininha realmente cobra — fica salvo pras próximas simulações.",
    )

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main():
    reader = PdfReader(ORIGINAL)
    writer = PdfWriter()

    for i, page in enumerate(reader.pages):
        page_w = float(page.mediabox.width)
        page_h = float(page.mediabox.height)

        if i == 21:  # página 22 (0-indexado)
            page.merge_page(overlay_pagina22(page_w, page_h))
        elif i == 13:  # página 14
            page.merge_page(overlay_pagina14(page_w, page_h))

        writer.add_page(page)

    with open(SAIDA, "wb") as f:
        writer.write(f)
    print(f"Gerado: {SAIDA}")


if __name__ == "__main__":
    main()
