import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { Badge, Button, Card, Input } from "@/components/ui";
import { iniciarPagamentoAssinatura } from "./actions";

const WHATSAPP_SUPORTE = process.env.SUPORTE_WHATSAPP ?? "5500000000000";
const MP_DISPONIVEL = Boolean(process.env.MP_ACCESS_TOKEN);

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
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-text">Liberar tudo</h1>
          <p className="mt-1 text-xs text-text-dim uppercase tracking-wide">
            Sem limite de clientes e com todas as funções
          </p>
        </div>

        {erroCupom ? (
          <p className="mb-4 rounded-xl border border-danger-border bg-danger-bg/40 px-3 py-2 text-center text-sm text-danger">
            {erroCupom}
          </p>
        ) : null}

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">Mensal</span>
              <Badge tone="neutral">Cancele quando quiser</Badge>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-accent">R$ 29</span>
              <span className="text-sm text-text-dim"> /mês</span>
            </div>
            {MP_DISPONIVEL ? (
              <form action={iniciarPagamentoAssinatura} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="plano" value="MENSAL" />
                <Input name="cupomCodigo" placeholder="Cupom de desconto (opcional)" className="text-sm" />
                <Button type="submit" className="w-full">
                  Pagar com Pix ou cartão
                </Button>
              </form>
            ) : null}
            <a href={linkPix("Mensal — R$ 29/mês")} target="_blank" rel="noreferrer">
              <Button variant="whatsapp" className="mt-2 w-full">
                Prefiro pagar no Pix — falar no WhatsApp
              </Button>
            </a>
          </Card>

          <Card className="flex flex-col gap-1 border-accent-strong">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">Anual · 2 meses grátis</span>
              <Badge tone="accent">R$ 290 à vista</Badge>
            </div>
            <div className="mt-1">
              <span className="text-2xl font-bold text-accent">R$ 24</span>
              <span className="text-sm text-text-dim"> /mês</span>
            </div>
            {MP_DISPONIVEL ? (
              <form action={iniciarPagamentoAssinatura} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="plano" value="ANUAL" />
                <Input name="cupomCodigo" placeholder="Cupom de desconto (opcional)" className="text-sm" />
                <Button type="submit" className="w-full">
                  Pagar com Pix ou cartão
                </Button>
              </form>
            ) : null}
            <a href={linkPix("Anual — R$ 290 à vista")} target="_blank" rel="noreferrer">
              <Button variant="whatsapp" className="mt-2 w-full">
                Prefiro pagar no Pix — falar no WhatsApp
              </Button>
            </a>
          </Card>

          <Link href={revendedor.papel === "ADMIN" ? "/admin" : "/painel"} className="text-center text-xs text-text-dim hover:text-text">
            Agora não
          </Link>
        </div>
      </div>
    </main>
  );
}
