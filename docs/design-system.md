# Design System do GestorPro

Documenta o sistema que já está em uso no código — não introduz nada novo.
Serve pra manter consistência conforme o app cresce: antes de inventar um
novo tom de cor, tamanho de fonte ou raio de borda, confira se já existe um
aqui.

## Cores

Definidas em `src/app/globals.css` como custom properties, com tema claro e
escuro (escuro é o padrão). Nunca usar hex direto no componente — sempre
pelas classes Tailwind geradas a partir do `@theme inline` (`bg-accent`,
`text-danger`, etc).

| Token | Uso |
|---|---|
| `bg` / `surface` / `surface-2` | Fundo da página / cards / fundo "recuado" (ex: cabeçalho de tabela) |
| `field` | Fundo de input/checkbox |
| `border` / `border-strong` | Borda padrão / borda com mais contraste (cards interativos, botões outline) |
| `text` / `text-muted` / `text-dim` | Texto principal / secundário / terciário (labels, legendas) |
| `accent` / `accent-strong` / `accent-soft` | Cor de ação do produto (teal) — botão primário, link, estado ativo |
| `danger` / `warning` / `success` | Semântico — nunca usar fora do contexto de status/alerta |
| `money` | Exclusivo pra valores em dinheiro (receita, lucro, preço) — nunca reusar pra outro propósito, é o que separa "dinheiro" de "ação" (accent) e "status" (warning/danger) no Painel |
| `info` | Informativo neutro (raramente usado) |
| `chart-1/2/3` | Paleta exclusiva de gráficos, validada pra contraste e daltonismo — nunca trocar sem revalidar |

Cada cor semântica (danger/warning/success/money) tem três variantes:
a cor em si, `-bg` (fundo bem suave) e `-border` (borda sutil) — usadas
juntas em badges e banners de alerta.

## Tipografia

Fonte: Geist (sans) / Geist Mono. Escala em uso (da menor pra maior):

| Classe | Tamanho | Uso |
|---|---|---|
| `text-[10px]` / `text-[11px]` | 10–11px | Caption — rótulo uppercase com tracking-wide (labels de StatTile, badges, eyebrow) |
| `text-xs` | 12px | Texto secundário, legendas, texto de apoio |
| `text-sm` | 14px | Corpo padrão — é o tamanho mais usado no app inteiro |
| `text-base` | 16px | Corpo com ênfase, título de card pequeno |
| `text-lg` | 18px | Subtítulo, título de card |
| `text-xl` → `text-5xl` | 20–48px | Headings — crescente conforme a hierarquia da página (h2 de seção até hero da landing) |

Peso: `font-semibold` é o padrão pra ênfase; `font-bold`/`font-extrabold` só
pra headings e números grandes (hero de receita, preço). Labels uppercase
sempre levam `tracking-wide` ou `tracking-wider`.

## Espaçamento

Escala padrão do Tailwind (múltiplos de 4px: 1=4px, 2=8px, 3=12px, 4=16px,
5=20px, 6=24px...). `gap-3` (12px) e `gap-2` (8px) são os mais comuns pra
espaçar itens dentro de um card; `gap-4`/`gap-5`/`gap-6` pra separar blocos
maiores. Nunca usar valor arbitrário (`gap-[13px]`) — se a escala padrão não
encaixa, o layout provavelmente precisa de outra abordagem, não de um
número fora da escala.

## Raio de borda

Três níveis, por tamanho do elemento — não "tudo arredondado igual":

| Classe | Uso |
|---|---|
| `rounded-lg` (8px) | Itens pequenos dentro de um card (item de nav, chip) |
| `rounded-xl` (12px) | Padrão — botões, inputs, cards menores |
| `rounded-2xl` (16px) | Cards principais, modais, painéis |
| `rounded-full` | Badges, avatares, pills, toggles |

## Componentes (`src/components/ui.tsx`)

Catálogo central — antes de criar um elemento novo (botão, badge, tile),
confira se já existe aqui:

`Card`, `CardRetratil` (accordion sem JS via `<details>`), `Field` (label +
campo), `Input`/`Textarea`/`Select` (mesmo estilo de campo), `Button` (5
variantes: `primary`/`ghost`/`danger`/`whatsapp`/`outline`), `Badge` (5
tons: `neutral`/`accent`/`warning`/`danger`/`success`), `Switch` (toggle
puro CSS), `StatTile`, `Avatar` (cor fixa por hash do nome), `Sparkline`,
`ProgressRing`, `TrendChip`, `EmptyState`.

### Estados já padronizados

- **Botão**: `disabled:opacity-50 disabled:cursor-not-allowed` automático
  via `buttonClassName`; texto do botão troca pra algo como "Salvando…"
  durante `useTransition` — nunca deixar o botão mudo durante o envio.
- **Input**: foco com `focus:border-accent focus:ring-1 focus:ring-accent`,
  mesmo padrão em todos os campos.
- **Linha de lista "em dia" vs urgente**: urgência visual vem do `Badge`
  (cor) — ações ao lado só ganham `opacity-60` em telas largas quando o
  item não tem urgência nenhuma (ver `src/app/(app)/clientes/page.tsx`),
  nunca removendo a ação, só reduzindo o peso visual.
- **Erro inesperado de página**: `error.tsx` por segmento de rota, sempre
  com mensagem humana + "Tentar de novo", nunca stack trace pro usuário.
- **Loading entre páginas**: `loading.tsx` por árvore de rotas (`(app)` e
  `admin` têm o seu) — esqueleto genérico (`animate-pulse`), não tela em
  branco.

## O que evitar

- Hex direto no JSX — sempre token.
- Novo tamanho de fonte ou espaçamento fora das escalas acima.
- Card por card por hábito — uma lista densa (ex: fila de cobrança) usa um
  Card só, com `divide-y` entre as linhas, não um Card por item.
- Badge/ícone decorativo sem significado — toda cor de Badge mapeia pra um
  estado real (vencido/vencendo/em dia, aprovado/pendente, etc).
