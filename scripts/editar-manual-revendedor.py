#!/usr/bin/env python3
"""Aplica edições pontuais no manual do revendedor, preservando o layout,
as imagens e o design originais — não redesenha nada.

Fonte: scripts/manual-revendedor-original.pdf (o PDF publicado antes desta
edição, guardado aqui pra qualquer ajuste futuro poder partir sempre do
mesmo original em vez de acumular edição sobre edição).

Edições aplicadas:
  1. Remove a página inteira "Precificação — calculadora de maquininha"
     (era a pág. 14) — o usuário não quer nenhuma menção a preço/taxa de
     maquininha no manual.
  2. Remove a página inteira "Sua assinatura do GestorPro" (era a pág. 22)
     — idem, nenhuma menção à tela de assinatura/pagamento da assinatura.
     Junto com a remoção da pág. 14, isso empurra as páginas seguintes pra
     trás: o número de capítulo (ex. "11" -> "10") e o rodapé (ex. "Página
     15" -> "Página 14") de cada página depois de uma removida são
     redesenhados, descontando quantas remoções vieram antes dela.
  3. Sumário (pág. 2) — remove as linhas "Precificação (maquininha)" e
     "Sua assinatura do GestorPro" e reflui as linhas restantes, com os
     números corrigidos.
  4. Introdução (pág. 3) — o bullet "Relatório financeiro, precificação e
     configurações da conta." vira "Relatório financeiro e configurações
     da conta.", e o bullet "Sua própria assinatura do GestorPro e
     instalação no celular." vira "Instalação no celular, como um app de
     verdade." (cabem numa linha só cada).
  5. Além do visual: qualquer menção a "precifica..."/"assinatura" que
     sobrasse escondida atrás dos retângulos brancos (pág. 2 e 3) é apagada
     de vez do stream do PDF, não só coberta — senão continuaria aparecendo
     numa busca de texto.

Rodar: pip install pypdf reportlab pikepdf && python3 scripts/editar-manual-revendedor.py
"""

import io
import re
import pikepdf
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
COR_NUM_CAPITULO = Color(0.7176, 0.7882, 0.7804)
COR_RODAPE = Color(0.3569, 0.4588, 0.5059)

# Páginas (1-indexado) removidas do original — "Precificação — calculadora
# de maquininha" e "Sua assinatura do GestorPro". Tudo depois de cada uma
# é renumerado pra trás, descontando quantas remoções vêm antes dela.
PAGINAS_REMOVIDAS = [14, 22]

# Número de capítulo (o "10", "11"...) de cada página 14-23 do original —
# a pág. 24 (última, "Obrigado por usar o GestorPro") não tem número de
# capítulo, só rodapé. Página 16 e 17 dividem o mesmo capítulo 12
# ("Configurações da conta 1/2" e "2/2").
CAPITULO_ORIGINAL = {14: 10, 15: 11, 16: 12, 17: 12, 18: 13, 19: 14, 20: 15, 21: 16, 22: 17, 23: 18}

# Capítulo de cada página removida (usado só pra descontar da numeração de
# capítulo das páginas depois dela — a pág. 14 é o capítulo 10, a pág. 22 o
# capítulo 17).
CAPITULOS_REMOVIDOS = sorted(CAPITULO_ORIGINAL[p] for p in PAGINAS_REMOVIDAS)


def nova_pagina(pagina_original):
    """Número de página final, descontando cada remoção que veio antes dela."""
    return pagina_original - sum(1 for r in PAGINAS_REMOVIDAS if r < pagina_original)


def novo_capitulo(pagina_original):
    """Número de capítulo final (ou None se a página não tem um), descontando
    cada capítulo removido que veio antes dele."""
    capitulo = CAPITULO_ORIGINAL.get(pagina_original)
    if capitulo is None:
        return None
    return capitulo - sum(1 for r in CAPITULOS_REMOVIDOS if r < capitulo)


def y(top, page_h):
    """Converte 'top' (pdfplumber, origem no canto superior) pra y do
    reportlab (origem no canto inferior)."""
    return page_h - top


def _parse_tounicode(font_obj):
    """Lê o CMap /ToUnicode de uma fonte (bfchar/bfrange) e devolve um dict
    {código CID de 2 bytes: caractere}. As fontes desse PDF são Type0 com
    /Encoding /Identity-H (subconjunto, código de 2 bytes por glifo) — sem
    decodificar por esse CMap não dá pra saber que código representa qual
    letra (não é ASCII nem WinAnsi, e não é 1 byte por caractere)."""
    dados = bytes(font_obj.ToUnicode.read_bytes()).decode("latin-1")
    mapa = {}
    for m in re.finditer(r"beginbfchar(.*?)endbfchar", dados, re.S):
        for cm in re.finditer(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", m.group(1)):
            origem, destino = cm.groups()
            mapa[int(origem, 16)] = "".join(
                chr(int(destino[i : i + 4], 16)) for i in range(0, len(destino), 4)
            )
    for m in re.finditer(r"beginbfrange(.*?)endbfrange", dados, re.S):
        for cm in re.finditer(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", m.group(1)):
            lo, hi, destino = cm.groups()
            lo, hi, base = int(lo, 16), int(hi, 16), int(destino, 16)
            for codigo in range(lo, hi + 1):
                mapa[codigo] = chr(base + (codigo - lo))
    return mapa


def _decodificar_cid(item_bytes, mapa):
    """Decodifica uma string Tj/TJ de uma fonte Identity-H (2 bytes por
    código CID) usando o dict do ToUnicode."""
    crus = bytes(item_bytes)
    codigos = [crus[i] * 256 + crus[i + 1] for i in range(0, len(crus) - 1, 2)]
    return "".join(mapa.get(c, "�") for c in codigos)


def redigir_texto_oculto(caminho_original, paginas_alvo, palavras_chave):
    """Apaga de vez (não só visualmente) qualquer trecho de texto que
    contenha uma das `palavras_chave` nas páginas indicadas (1-indexado).

    Sobrepor um retângulo branco por cima do texto (como os overlays deste
    script já fazem) esconde visualmente, mas o texto original continua no
    stream do PDF e aparece numa busca por Ctrl+F ou ao selecionar/copiar —
    exatamente o tipo de coisa que o usuário reclamou estar "sempre lá".

    Cada palavra costuma vir fatiada em vários Tj curtos (um por sílaba/
    trecho), então primeiro concatena o texto decodificado de toda a página
    na ordem em que é desenhado, localiza a palavra-chave nesse texto
    corrido, e só então volta e esvazia (Tj/TJ -> string vazia) exatamente
    os pedaços que contribuíram pra esse trecho — mantendo o resto do
    stream intocado.

    Devolve o caminho de um PDF temporário com essas páginas já redigidas —
    o restante do pipeline (overlays de branco+redesenho) continua igual,
    só que a partir desse arquivo em vez do original bruto.
    """
    alvo_lower = [p.lower() for p in palavras_chave]
    pdf = pikepdf.open(caminho_original)

    for pagina_num in paginas_alvo:
        page = pdf.pages[pagina_num - 1]
        cmaps = {str(nome): _parse_tounicode(fonte) for nome, fonte in page.Resources.Font.items()}

        instrucoes = pikepdf.parse_content_stream(page)

        # 1ª passada: decodifica cada pedaço de string na ordem do stream,
        # guardando de qual instrução (e, se for TJ, qual posição dentro do
        # array) cada um veio. `operands`/os objetos do pikepdf são
        # somente-leitura — não dá pra esvaziar um pedaço mutando-o direto,
        # é preciso reconstruir a instrução inteira depois (2ª passada).
        pedacos = []  # (idx_instrucao, idx_no_array_ou_None, texto)
        fonte_atual = None
        for idx_instr, instr in enumerate(instrucoes):
            operador = str(instr.operator)
            if operador == "Tf":
                fonte_atual = str(instr.operands[0])
                continue
            if operador not in ("Tj", "TJ"):
                continue
            mapa = cmaps.get(fonte_atual, {})
            if operador == "Tj":
                item = instr.operands[0]
                if isinstance(item, pikepdf.String):
                    pedacos.append((idx_instr, None, _decodificar_cid(item, mapa)))
            else:
                for i, item in enumerate(instr.operands[0]):
                    if isinstance(item, pikepdf.String):
                        pedacos.append((idx_instr, i, _decodificar_cid(item, mapa)))

        texto_corrido = "".join(p[2] for p in pedacos).lower()

        # 2ª passada: acha os índices (no texto corrido) de cada palavra-chave
        # e marca quais pedaços caem dentro desses intervalos.
        alvos = set()  # (idx_instrucao, idx_no_array_ou_None)
        for chave in alvo_lower:
            inicio = 0
            while True:
                pos = texto_corrido.find(chave, inicio)
                if pos == -1:
                    break
                fim = pos + len(chave)
                # a palavra-chave costuma ser só o radical (ex. "precifica"
                # cobre "precificação"/"Precificação") — estende até o fim
                # da palavra de verdade, senão o resto ("ção") fica pra trás
                # espalhado num pedaço de Tj separado.
                while fim < len(texto_corrido) and texto_corrido[fim].isalpha():
                    fim += 1
                cursor = 0
                for idx_instr, idx_array, texto in pedacos:
                    ini_pedaco, fim_pedaco = cursor, cursor + len(texto)
                    if ini_pedaco < fim and fim_pedaco > pos:
                        alvos.add((idx_instr, idx_array))
                    cursor = fim_pedaco
                inicio = fim

        # 3ª passada: reconstrói cada instrução alvo do zero (com a(s)
        # string(s) marcada(s) trocadas por string vazia) e monta a lista
        # final na mesma ordem — o resto do stream permanece intocado.
        instrucoes_alvo = {idx for idx, _ in alvos}
        nova_lista = []
        for idx_instr, instr in enumerate(instrucoes):
            if idx_instr not in instrucoes_alvo:
                nova_lista.append(instr)
                continue
            operador = str(instr.operator)
            if operador == "Tj":
                nova_lista.append(pikepdf.ContentStreamInstruction([pikepdf.String(b"")], instr.operator))
            else:
                novo_array = [
                    pikepdf.String(b"") if (idx_instr, i) in alvos else item
                    for i, item in enumerate(instr.operands[0])
                ]
                nova_lista.append(pikepdf.ContentStreamInstruction([pikepdf.Array(novo_array)], instr.operator))

        pdf.pages[pagina_num - 1].Contents = pdf.make_stream(pikepdf.unparse_content_stream(nova_lista))

    saida = "/tmp/manual-revendedor-original-redigido.pdf"
    pdf.save(saida)
    return saida


COR_BORDA = Color(0.8588, 0.9059, 0.902)


def draw_dots(c, x0, x1, top, page_h):
    """Réplica do "leader" pontilhado do sumário original: quadradinhos de
    0.75x0.75pt espaçados 1.5pt entre si (mesmo passo do PDF de origem)."""
    c.setFillColor(COR_BORDA)
    x = x0
    while x < x1:
        c.rect(x, y(top + 0.75, page_h), 0.75, 0.75, fill=1, stroke=0)
        x += 1.5


def overlay_sumario(page_w, page_h):
    """Pág. 2 (Sumário) — remove as linhas "Precificação (maquininha)" e
    "Sua assinatura do GestorPro" e reflui as linhas restantes a partir de
    onde "Plataformas de crédito" (a última linha intocada) termina, com o
    espaçamento padrão de 21pt entre linhas, números de página corrigidos e
    o mesmo par de linhas pontilhadas (leader até o número + divisor da
    linha inteira) que o restante do sumário usa."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))

    # Começa em 435 (não 430) pra não apagar o divisor pontilhado da linha
    # "Plataformas de crédito" logo acima, que não muda de posição.
    c.setFillColor(white)
    c.rect(0, y(619, page_h), page_w, 619 - 435, fill=1, stroke=0)

    # Todas as linhas originais depois de "Plataformas de crédito" (13, a
    # última que não muda) — (título, x1 do título original, página
    # original). "Precificação" e "Sua assinatura" ficam de fora do
    # resultado final (PAGINAS_REMOVIDAS), o resto reflui pra cima.
    ENTRADAS_ORIGINAIS = [
        ("Precificação (maquininha)", 160.9, 14),
        ("Relatório financeiro", 131.5, 15),
        ("Configurações da conta", 150.9, 16),
        ("Funcionários (sub-contas)", 160.9, 18),
        ("Modelos de mensagem", 149.3, 19),
        ("Histórico de ações", 127.6, 20),
        ("Notificações (sininho)", 140.9, 21),
        ("Sua assinatura do GestorPro", 174.3, 22),
        ("Instalando no celular (PWA)", 169.4, 23),
    ]
    ANCORA_TOP = 418.9  # top de "Plataformas de crédito", que fica no lugar

    top = ANCORA_TOP
    for texto, titulo_x1, pagina_original in ENTRADAS_ORIGINAIS:
        if pagina_original in PAGINAS_REMOVIDAS:
            continue
        top += 21.0
        pagina_nova = nova_pagina(pagina_original)
        c.setFont(FONT, 10.0)
        c.setFillColor(COR_CORPO)
        c.drawString(45.4, y(top + 9.5, page_h), texto)
        c.drawString(269.5, y(top + 9.5, page_h), str(pagina_nova))
        draw_dots(c, titulo_x1 + 5.4, 264.0, top + 3.7, page_h)  # leader até o número
        draw_dots(c, 45.0, 280.5, top + 14.6, page_h)  # divisor da linha inteira

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def overlay_introducao(page_w, page_h):
    """Pág. 3 (O que é o GestorPro) — dois bullets da coluna direita perdem
    a menção que não deve mais aparecer, cada um cabendo numa linha só:
      "Relatório financeiro, precificação e configurações da conta."
        -> "Relatório financeiro e configurações da conta."
      "Sua própria assinatura do GestorPro e instalação no celular."
        -> "Instalação no celular, como um app de verdade."
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))

    c.setFillColor(white)
    c.rect(305, y(330, page_h), page_w - 305, 330 - 270, fill=1, stroke=0)

    c.setFont(FONT_BOLD, 9.3)
    c.setFillColor(COR_ACCENT)
    c.drawString(309.0, y(273.2 + 8.3, page_h), "›")
    c.setFont(FONT, 9.3)
    c.setFillColor(COR_CORPO)
    c.drawString(320.3, y(273.2 + 8.3, page_h), "Relatório financeiro e configurações da conta.")

    DESLOC = 305.4 - 291.9  # 13.5pt — fecha a linha que sobrou do bullet acima
    c.setFont(FONT_BOLD, 9.3)
    c.setFillColor(COR_ACCENT)
    c.drawString(309.0, y(305.4 - DESLOC + 8.3, page_h), "›")
    c.setFont(FONT, 9.3)
    c.setFillColor(COR_CORPO)
    c.drawString(320.3, y(305.4 - DESLOC + 8.3, page_h), "Instalação no celular, como um app de verdade.")

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def overlay_renumeracao(page_w, page_h, capitulo_novo, pagina_nova):
    """Redesenha o número de capítulo (se houver) e o número de página do
    rodapé, uma posição pra trás — usado em toda página depois da removida."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(page_w, page_h))

    if capitulo_novo is not None:
        c.setFillColor(white)
        c.rect(43, y(121, page_h), 22, 121 - 106, fill=1, stroke=0)
        c.setFont(FONT_BOLD, 11.0)
        c.setFillColor(COR_NUM_CAPITULO)
        c.drawString(45.35, y(119.33, page_h), f"{capitulo_novo:02d}")

    c.setFillColor(white)
    c.rect(538, y(805, page_h), 14, 805 - 793, fill=1, stroke=0)
    c.setFont(FONT, 7.5)
    c.setFillColor(COR_RODAPE)
    c.drawString(541.57, y(801.59, page_h), str(pagina_nova))

    c.save()
    buf.seek(0)
    return PdfReader(buf).pages[0]


def main():
    # Apaga de verdade (não só visualmente) qualquer texto "precificação" ou
    # "assinatura" que sobreviva por baixo dos retângulos brancos do sumário
    # (pág. 2) e da introdução (pág. 3) — sem isso, uma busca de texto no PDF
    # ainda encontraria a palavra mesmo com o layout já corrigido.
    caminho_base = redigir_texto_oculto(ORIGINAL, paginas_alvo=[2, 3], palavras_chave=["precifica", "assinatura"])

    reader = PdfReader(caminho_base)
    writer = PdfWriter()

    for i, page in enumerate(reader.pages):
        pagina_original = i + 1
        if pagina_original in PAGINAS_REMOVIDAS:
            continue  # remove a página inteira (Precificação ou Sua assinatura)

        page_w = float(page.mediabox.width)
        page_h = float(page.mediabox.height)

        if pagina_original == 2:
            page.merge_page(overlay_sumario(page_w, page_h))
        elif pagina_original == 3:
            page.merge_page(overlay_introducao(page_w, page_h))

        if pagina_original > PAGINAS_REMOVIDAS[0]:
            page.merge_page(overlay_renumeracao(page_w, page_h, novo_capitulo(pagina_original), nova_pagina(pagina_original)))

        writer.add_page(page)

    with open(SAIDA, "wb") as f:
        writer.write(f)
    print(f"Gerado: {SAIDA} ({len(writer.pages)} páginas)")


if __name__ == "__main__":
    main()
