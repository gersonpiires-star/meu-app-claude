# GestorPro

Sistema de gestão para revenda de streaming: clientes, cobrança via WhatsApp e Mercado Pago, vendas de aparelhos, estoque e relatório financeiro. Multi-tenant (cada revendedor só vê os próprios dados) com um painel de administrador para quem opera o GestorPro como SaaS.

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind CSS v4
- **Prisma 7** + **Postgres** (pensado para rodar no [Supabase](https://supabase.com))
- **NextAuth v5** (Credentials + JWT) para login dos revendedores
- **Mercado Pago** (Checkout Pro) para pagamento online de assinatura e de renovação de clientes
- **PWA** instalável (celular e computador, direto pelo navegador — sem loja de app)

## Como rodar localmente

Precisa de um Postgres (local ou já no Supabase — veja abaixo).

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e gere um AUTH_SECRET (comando sugerido no arquivo)
npm run db:migrate          # aplica o schema no banco
npm run db:seed             # cria a conta de administrador (admin@gestorpro.app / trocar123)
npm run dev
```

Acesse `http://localhost:3000`. Crie uma conta de revendedor pela tela de cadastro (trial de 7 dias automático), ou entre como administrador com as credenciais do seed.

## Estrutura

- `src/app/(app)/` — telas do revendedor: painel, clientes, vendas, estoque, relatório, configurações
- `src/app/admin/` — painel do administrador: assinantes, interessados, comunicados
- `src/app/entrar`, `src/app/cadastro`, `src/app/assinatura` — autenticação e cobrança da assinatura
- `src/app/api/webhooks/mercadopago` — recebe as notificações de pagamento
- `src/app/api/webhooks/whatsapp` — recebe as mensagens do assessor de IA no WhatsApp (via Twilio)
- `src/lib/` — regras de negócio (cálculo de vencimento por plano, formatação, modelos de mensagem, integração Mercado Pago)
- `src/lib/assessor/` — ferramentas e loop de conversa do assessor de IA (Claude)
- `prisma/schema.prisma` — modelo de dados

## Pagamentos com Mercado Pago

Há dois fluxos independentes, cada um com o token de uma conta diferente:

1. **Assinatura do GestorPro** (o revendedor pagando pelo app) usa `MP_ACCESS_TOKEN`/`MP_PUBLIC_KEY` da
   conta da **plataforma** (você, dono do GestorPro). Sem essas variáveis configuradas, a tela
   `/assinatura` mostra só o fluxo antigo por WhatsApp/Pix manual — nada quebra.
2. **Renovação de cliente** (o revendedor cobrando o cliente dele) usa o Access Token que **cada
   revendedor** cola em `/configuracoes` — o dinheiro cai direto na conta do revendedor, o GestorPro
   nunca fica no meio do dinheiro.

Em ambos os casos, o webhook (`/api/webhooks/mercadopago`) nunca confia no corpo da notificação: ele
busca o pagamento na API do Mercado Pago com o token correto antes de liberar qualquer acesso ou
renovar qualquer cliente.

Para credenciais de teste (sandbox) ou produção, veja
`mercadopago.com.br/developers/panel/app`. Depois de configurar `MP_ACCESS_TOKEN` você não precisa
cadastrar a `notification_url` manualmente no painel do Mercado Pago — ela é enviada em cada preferência
criada, apontando para `APP_URL` + `/api/webhooks/mercadopago`.

## Assessor de IA no WhatsApp

Cada revendedor pode ligar (em `/configuracoes`) um assessor de IA que responde no WhatsApp dele,
com acesso aos próprios dados do GestorPro — consultar clientes, vencimentos e financeiro, cadastrar
cliente, renovar plano, registrar venda de aparelho, mandar cobrança pro cliente e disparar lembrete
de vencimento em lote.

**Como funciona**: o revendedor manda mensagem pro número configurado; o webhook identifica quem
escreveu pelo número (comparado com o `whatsapp` cadastrado no perfil), manda a mensagem pro Claude
com acesso a um conjunto de ferramentas (`src/lib/assessor/`) que consultam/alteram só os dados
daquele revendedor, e devolve a resposta pelo mesmo WhatsApp.

**Dois canais possíveis** — escolhido por `WHATSAPP_PROVIDER` (`twilio`, o padrão, ou `zapi`), atrás
de uma fachada única (`src/lib/whatsapp.ts`) que o resto do código usa sem saber qual dos dois está
ligado:

| | **Twilio** (`WHATSAPP_PROVIDER=twilio`) | **Z-API** (`WHATSAPP_PROVIDER=zapi`) |
|---|---|---|
| Natureza | API oficial da Meta, via parceiro | Não oficial — conecta escaneando um QR code, como o WhatsApp Web |
| Custo | Por mensagem | Mensalidade fixa, geralmente mais barata |
| Aprovação | Sandbox imediato; número Business precisa aprovação da Meta | Nenhuma — só escanear o QR |
| Mensagem fora de 24h | Só com Content Template aprovado pela Meta | Sempre funciona (não segue essa regra) |
| Risco | Baixo — dentro dos termos do WhatsApp | **Alto** — viola os termos de uso do WhatsApp; risco real do número ser banido |

Pro Z-API valer a pena o risco tem que ser um número dedicado só pra isso (nunca o WhatsApp pessoal do
revendedor) — se banir, baniu só esse número.

**Configuração comum** (qualquer canal):

- `ANTHROPIC_API_KEY` — chave da API da Anthropic (console.anthropic.com).
- `ASSESSOR_LIMITE_MENSAGENS_DIA` (opcional, padrão `60`) — teto de mensagens por dia por revendedor,
  pra evitar que um caso de abuso ou loop vire um custo desproporcional. Ao atingir o limite, o
  assessor avisa e para de chamar a API da Anthropic até o dia seguinte (fuso de Brasília).
- `ASSESSOR_LIMITE_CONFIRMACAO` (opcional, padrão `100`) — valor em reais a partir do qual uma
  renovação ou venda não executa direto: o assessor descreve a ação e só aplica depois que o
  revendedor confirmar na conversa (fica guardado em `AcaoPendenteAssessor` por até 10 minutos).

Sem as variáveis do canal escolhido configuradas, o botão "Ligar assessor" em Configurações continua
existindo mas avisa que a integração não está pronta — nada quebra pro resto do app.

**Configuração — Twilio** (`WHATSAPP_PROVIDER=twilio`, padrão):

- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — credenciais da conta Twilio (console.twilio.com).
- `TWILIO_WHATSAPP_NUMBER` — número de WhatsApp da Twilio, no formato `whatsapp:+14155238886`.
- No painel da Twilio, em **Messaging → Try it out → Send a WhatsApp message** (sandbox) ou no seu
  número de WhatsApp Business aprovado, configure **"WHEN A MESSAGE COMES IN"** para
  `POST` em `${APP_URL}/api/webhooks/whatsapp`.

**Configuração — Z-API** (`WHATSAPP_PROVIDER=zapi`):

- Crie uma instância em [z-api.io](https://www.z-api.io) e escaneie o QR code com o número dedicado.
- `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN` — aparecem no painel da instância.
- `ZAPI_CLIENT_TOKEN` (opcional, mas recomendado) — o "Account Security Token" da sua conta Z-API,
  exigido nas chamadas de envio.
- `ZAPI_WEBHOOK_SECRET` — um segredo aleatório que você mesmo escolhe (ex: `openssl rand -hex 24`).
  A Z-API **não assina** o corpo do webhook como a Twilio faz — sem esse segredo o endpoint rejeita
  tudo por padrão (fail-closed), então é ele que garante que a notificação veio da sua instância.
- No painel da instância, em **Webhooks → Ao receber**, configure
  `${APP_URL}/api/webhooks/whatsapp-zapi?secret=SEU_ZAPI_WEBHOOK_SECRET`. Trate essa URL completa
  como segredo (não é só a rota, é a query string também).

**Lembrete de vencimento em lote (proativo, fora da janela de 24h)**: por padrão, a Twilio (como
qualquer provedor da API oficial do WhatsApp) só permite mensagem livre pra quem escreveu pra você
nas últimas 24h — é por isso que **enviar_cobranca** (uma mensagem por vez, pro cliente que o
revendedor pedir) só funciona dentro dessa janela nesse canal. Pra mandar lembrete proativo — "avisa
todo mundo que vence essa semana" — o assessor tem a ferramenta **enviar_lembretes_vencimento**:

- **Com Z-API**, funciona direto — o canal não segue a regra de janela de 24h, então manda a mesma
  mensagem livre configurável usada em `enviar_cobranca` (personalizável em Configurações →
  Modelos de mensagem).
- **Com Twilio**, exige um **Content Template** aprovado pela Meta:
  1. No Console da Twilio, vá em **Messaging → Content Template Builder** e crie um template
     categoria **Utility**, com o texto (4 variáveis, nessa ordem):
     > Olá {{1}}! Passando para lembrar que seu plano {{2}} está com vencimento em {{3}}, no valor de
     > {{4}}. Para continuar com o acesso, é só renovar com quem te atende.
  2. Envie pra aprovação da Meta (leva de minutos a poucos dias) e copie o `ContentSid` (começa com
     `HX...`) depois de aprovado.
  3. Configure `TWILIO_CONTENT_SID_LEMBRETE=HX...` nas variáveis de ambiente.

Sem essa variável, o assessor explica pro revendedor que a função ainda não foi habilitada, em vez de
tentar e falhar silenciosamente. Acima de 5 clientes de uma vez, o envio também pede confirmação antes
de disparar.

**Outras limitações importantes**:

- Cada webhook confere que a requisição realmente veio do provedor certo antes de fazer qualquer
  coisa: a rota da Twilio confere a assinatura `X-Twilio-Signature`; a da Z-API confere o
  `?secret=` na própria URL (ver `ZAPI_WEBHOOK_SECRET` acima).
- **Z-API roda por fora dos termos de uso do WhatsApp** — é a Meta quem pode banir o número a
  qualquer momento, sem aviso, e o GestorPro não tem controle nem visibilidade sobre isso. Use um
  número dedicado só pra isso, nunca o WhatsApp pessoal do revendedor.
- O histórico da conversa com o assessor fica salvo no banco (`ConversaAssessor`) só o suficiente
  pra dar contexto às próximas mensagens — não é uma tela de chat dentro do app.
- Cada mensagem trocada com o assessor consome créditos da sua conta Anthropic (modelo padrão
  `claude-opus-5`, configurável via `ANTHROPIC_MODEL`) e, dependendo do canal, também da sua conta
  Twilio ou Z-API — o limite diário (acima) reduz o risco, mas monitore o consumo se for liberar
  pra muita gente.
- **Áudio, figurinha e foto ainda não são entendidos** — o assessor responde pedindo pra escrever em
  texto, em vez de ficar em silêncio. Transcrever áudio exigiria integrar um serviço de
  speech-to-text (Claude não recebe áudio diretamente); não implementado aqui por ser uma escolha de
  fornecedor/custo que caberia decidir antes.

## Deploy (Supabase + Vercel)

1. **Banco de dados**: crie um projeto em [supabase.com](https://supabase.com) (gratuito para começar).
   No botão **Connect** do projeto, você vai precisar de **duas** connection strings do mesmo projeto:
   - `DATABASE_URL` = aba **Transaction pooler** (porta `6543`, host
     `aws-0-<região>.pooler.supabase.com`, usuário `postgres.<ref-do-projeto>`, com
     `?pgbouncer=true` no final). É a que o app usa em produção pra tudo.
   - `DIRECT_URL` = aba **Session pooler** (porta `5432`, mesmo host e usuário, sem
     `?pgbouncer=true`). É usada só durante o build, pra rodar a migração — o Prisma Migrate
     precisa de locks que o pooler em modo "transaction" não sustenta.
   - Nunca use a conexão direta (`db.<ref>.supabase.co`) em nenhuma das duas: só aceita IPv6 e a
     Vercel (e várias redes) não alcançam.
2. **Não precisa rodar a migração manualmente**: o script `vercel-build` (já configurado no
   `package.json`) roda `prisma migrate deploy` (usando `DIRECT_URL`) automaticamente antes de cada
   build na Vercel. No primeiro deploy, ele já cria todas as tabelas.
3. **Hospedagem**: importe este repositório em [vercel.com](https://vercel.com) (New Project → Import
   Git Repository). A Vercel detecta o script `vercel-build` automaticamente — não precisa mexer no
   "Build Command".
4. Configure as variáveis de ambiente no projeto da Vercel:
   - `DATABASE_URL` e `DIRECT_URL` (as duas do Supabase, formato acima)
   - `AUTH_SECRET` (gere com o comando do `.env.example`) e `AUTH_TRUST_HOST=true`
   - `APP_URL` = a URL pública que a Vercel te der (ex: `https://gestorpro.vercel.app`)
   - `SUPORTE_WHATSAPP`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` conforme a seção acima
   - `ANTHROPIC_API_KEY` + as do canal de WhatsApp escolhido (`WHATSAPP_PROVIDER` e as variáveis da
     Twilio ou da Z-API) — opcionais, só necessárias pro assessor de IA no WhatsApp, ver seção acima
5. Deploy. A URL que a Vercel gerar já é o endereço público do app. Depois de rodar, crie o admin
   direto pela SQL Editor do Supabase (cadastre-se normalmente pela tela do app e rode
   `update "Revendedor" set papel = 'ADMIN' where email = 'seu@email.com';`), já que o `db:seed`
   também não roda por aqui — a mesma restrição de rede do pooler direto se aplica a rodar comandos
   contra o Supabase de fora da Vercel.

## Instalar como app (celular e PC)

Não é publicado em loja de app — é um **PWA**: com o site aberto no navegador (Chrome/Edge no
computador, Chrome/Safari no celular), aparece a opção "Instalar app" / "Adicionar à tela inicial".
Isso já funciona assim que o deploy estiver em HTTPS público; não precisa de nenhum passo extra.
