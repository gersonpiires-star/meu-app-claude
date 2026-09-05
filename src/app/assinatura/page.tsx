import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { Badge, Button, Card, Input } from "@/components/ui";
import { iniciarPagamentoAssinatura } from "./actions";
import {
  PRECO_MENSAL,
  PRECO_SEMESTRAL,
  PRECO_SEMESTRAL_MENSALIZADO,
  PRECO_ANUAL,
  PRECO_ANUAL_MENSALIZADO,
} from "@/lib/planos-assinatura";
import { brl, brl0 } from "@/lib/format";

const WHATSAPP_SUPORTE = process.env.SUPORTE_WHATSAPP ?? "5500000000000";
const MP_DISPONIVEL = Boolean(process.env.MP_ACCESS_TOKEN);

const BENEFICIOS = [
  "Clientes, vendas e estoque num só lugar",
  "Custo real de estoque por lote (FIFO), sem chute",
  "Recibo em PDF automático em toda venda e renovação",
  "Cobrança e renovação em lote, com lembrete automático",
  "Relatório financeiro completo, mês a mês",
  "Instala no celular e funciona como um app de verdade",
];

function linkPix(plano: string) {
  const texto = encodeURIComponent(`Olá! Quero liberar o GestorPro no plano ${plano} — prefiro pagar via Pix.`);
  return `https://wa.me/${WHATSAPP_SUPORTE}?text=${texto}`;
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ erroCupom?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { erroCupom } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-text">Liberar tudo no GestorPro</h1>
          <p className="mt-1 text-sm text-text-dim">Sem limite de clientes e com todas as funções</p>
        </div>

        <Card className="mb-5">
          <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-0.5 shrink-0 font-bold text-accent">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>

        {erroCupom ? (
          <p className="mb-4 rounded-xl border border-danger-border bg-danger-bg/40 px-3 py-2 text-center text-sm text-danger">
            {erroCupom}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="flex flex-col gap-2.5 p-4">
            <span className="text-sm font-bold text-text">Mensal</span>
            <div>
              <span className="text-xl font-bold text-accent sm:text-2xl">{brl(PRECO_MENSAL)}</span>
              <p className="mt-0.5 text-[11px] text-text-dim">por mês · cancele quando quiser</p>
            </div>
            {MP_DISPONIVEL ? (
              <form action={iniciarPagamentoAssinatura} className="flex flex-col gap-2">
                <input type="hidden" name="plano" value="MENSAL" />
                <Input name="cupomCodigo" placeholder="Cupom (opcional)" className="px-2.5 py-2 text-xs" />
                <Button type="submit" className="w-full text-sm">
                  Assinar
                </Button>
                <p className="text-center text-[10px] leading-tight text-text-dim">
                  Pix (QR Code ou copia e cola) ou cartão, via Mercado Pago
                </p>
              </form>
            ) : null}
            <a href={linkPix(`Mensal — ${brl(PRECO_MENSAL)}/mês`)} target="_blank" rel="noreferrer">
              <Button variant="whatsapp" className="w-full text-xs">
                Pix pelo WhatsApp
              </Button>
            </a>
          </Card>

          <Card className="flex flex-col gap-2.5 p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-text">Semestral</span>
              <Badge tone="accent">10% de desconto</Badge>
            </div>
            <div>
              <span className="text-xl font-bold text-accent sm:text-2xl">{brl0(PRECO_SEMESTRAL_MENSALIZADO)}</span>
              <p className="mt-0.5 text-[11px] text-text-dim">por mês · {brl(PRECO_SEMESTRAL)} à vista</p>
            </div>
            {MP_DISPONIVEL ? (
              <form action={iniciarPagamentoAssinatura} className="flex flex-col gap-2">
                <input type="hidden" name="plano" value="SEMESTRAL" />
                <Input name="cupomCodigo" placeholder="Cupom (opcional)" className="px-2.5 py-2 text-xs" />
                <Button type="submit" className="w-full text-sm">
                  Assinar
                </Button>
                <p className="text-center text-[10px] leading-tight text-text-dim">
                  Pix (QR Code ou copia e cola) ou cartão, via Mercado Pago
                </p>
              </form>
            ) : null}
            <a href={linkPix(`Semestral — ${brl(PRECO_SEMESTRAL)} à vista`)} target="_blank" rel="noreferrer">
              <Button variant="whatsapp" className="w-full text-xs">
                Pix pelo WhatsApp
              </Button>
            </a>
          </Card>

          <Card className="flex flex-col gap-2.5 border-accent-strong p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-text">Anual</span>
              <Badge tone="accent">2 meses grátis</Badge>
            </div>
            <div>
              <span className="text-xl font-bold text-accent sm:text-2xl">{brl0(PRECO_ANUAL_MENSALIZADO)}</span>
              <p className="mt-0.5 text-[11px] text-text-dim">por mês · {brl(PRECO_ANUAL)} à vista</p>
            </div>
            {MP_DISPONIVEL ? (
              <form action={iniciarPagamentoAssinatura} className="flex flex-col gap-2">
                <input type="hidden" name="plano" value="ANUAL" />
                <Input name="cupomCodigo" placeholder="Cupom (opcional)" className="px-2.5 py-2 text-xs" />
                <Button type="submit" className="w-full text-sm">
                  Assinar
                </Button>
                <p className="text-center text-[10px] leading-tight text-text-dim">
                  Pix (QR Code ou copia e cola) ou cartão, via Mercado Pago
                </p>
              </form>
            ) : null}
            <a href={linkPix(`Anual — ${brl(PRECO_ANUAL)} à vista`)} target="_blank" rel="noreferrer">
              <Button variant="whatsapp" className="w-full text-xs">
                Pix pelo WhatsApp
              </Button>
            </a>
          </Card>
        </div>

        <Link
          href={revendedor.papel === "ADMIN" ? "/admin" : "/painel"}
          className="mt-4 block text-center text-xs text-text-dim hover:text-text"
        >
          Agora não
        </Link>
      </div>
    </main>
  );
}
