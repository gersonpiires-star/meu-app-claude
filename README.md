# GestorPro

Sistema de gestão para revenda de IPTV/streaming: clientes, cobrança via WhatsApp e Mercado Pago, vendas de aparelhos, estoque e relatório financeiro. Multi-tenant (cada revendedor só vê os próprios dados) com um painel de administrador para quem opera o GestorPro como SaaS.

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
- `src/lib/` — regras de negócio (cálculo de vencimento por plano, formatação, modelos de mensagem, integração Mercado Pago)
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

## Deploy (Supabase + Vercel)

1. **Banco de dados**: crie um projeto em [supabase.com](https://supabase.com) (gratuito para começar).
   Em *Project Settings → Database → Connection string → URI*, use o **Transaction pooler** (porta
   `6543`, com `?pgbouncer=true` no final) como `DATABASE_URL`.
2. Rode as migrações contra o banco do Supabase uma vez: `DATABASE_URL="<sua-url>" npm run db:deploy`
   (e opcionalmente `npm run db:seed` para criar o admin).
3. **Hospedagem**: importe este repositório em [vercel.com](https://vercel.com) (New Project → Import
   Git Repository). O `postinstall` do projeto já roda `prisma generate` sozinho.
4. Configure as variáveis de ambiente no projeto da Vercel:
   - `DATABASE_URL` (a do Supabase)
   - `AUTH_SECRET` (gere com o comando do `.env.example`) e `AUTH_TRUST_HOST=true`
   - `APP_URL` = a URL pública que a Vercel te der (ex: `https://gestorpro.vercel.app`)
   - `SUPORTE_WHATSAPP`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` conforme a seção acima
5. Deploy. A URL que a Vercel gerar já é o endereço público do app.

## Instalar como app (celular e PC)

Não é publicado em loja de app — é um **PWA**: com o site aberto no navegador (Chrome/Edge no
computador, Chrome/Safari no celular), aparece a opção "Instalar app" / "Adicionar à tela inicial".
Isso já funciona assim que o deploy estiver em HTTPS público; não precisa de nenhum passo extra.
