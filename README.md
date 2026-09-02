# GestorPro

Sistema de gestão para revenda de IPTV/streaming: clientes, cobrança via WhatsApp, vendas de aparelhos, estoque e relatório financeiro. Multi-tenant (cada revendedor só vê os próprios dados) com um painel de administrador para quem opera o GestorPro como SaaS.

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind CSS v4
- **Prisma 7** com SQLite em desenvolvimento (troque `DATABASE_URL` para Postgres em produção — o schema não muda)
- **NextAuth v5** (Credentials + JWT) para login dos revendedores

## Como rodar

```bash
npm install
cp .env.example .env        # gere um AUTH_SECRET (comando sugerido dentro do arquivo)
npm run db:migrate          # cria o banco SQLite local
npm run db:seed             # cria a conta de administrador (admin@gestorpro.app / trocar123)
npm run dev
```

Acesse `http://localhost:3000`. Crie uma conta de revendedor pela tela de cadastro (trial de 7 dias automático), ou entre como administrador com as credenciais do seed.

## Estrutura

- `src/app/(app)/` — telas do revendedor: painel, clientes, vendas, estoque, relatório
- `src/app/admin/` — painel do administrador: assinantes, interessados, comunicados
- `src/app/entrar`, `src/app/cadastro`, `src/app/assinatura` — autenticação e cobrança da assinatura
- `src/lib/` — regras de negócio (cálculo de vencimento por plano, formatação, modelos de mensagem para WhatsApp)
- `prisma/schema.prisma` — modelo de dados

## Assinatura / cobrança

O modelo replica o design original: sem checkout automático. O botão "Prefiro pagar no Pix" abre uma conversa de WhatsApp com o número definido em `SUPORTE_WHATSAPP` (`.env`), e o administrador libera o acesso manualmente pelo painel (`/admin/assinantes/[id]`) após confirmar o pagamento.

## Produção

- Troque `DATABASE_URL` para uma connection string Postgres e rode `prisma migrate deploy`.
- Defina `AUTH_SECRET`, `AUTH_TRUST_HOST=true` e `SUPORTE_WHATSAPP` nas variáveis de ambiente do host (ex: Vercel).
