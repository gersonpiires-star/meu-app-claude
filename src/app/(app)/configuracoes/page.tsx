import { exigirRevendedor } from "@/lib/sessao";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { salvarCredenciaisMP } from "./actions";

export default async function ConfiguracoesPage() {
  const revendedor = await exigirRevendedor();
  const configurado = Boolean(revendedor.mpAccessToken);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Configurações</h1>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">Receber pagamentos online (Mercado Pago)</h2>
          {configurado ? <Badge tone="accent">Configurado</Badge> : <Badge tone="neutral">Não configurado</Badge>}
        </div>
        <p className="mb-4 text-sm text-text-dim">
          Cole aqui o Access Token da sua própria conta do Mercado Pago para gerar links de pagamento
          (Pix, cartão) na cobrança dos seus clientes — o dinheiro cai direto na sua conta, o GestorPro
          não fica no meio. Pegue suas credenciais de produção em
          mercadopago.com.br/developers/panel/app, na seção &quot;Credenciais de produção&quot;.
        </p>
        <form action={salvarCredenciaisMP} className="flex flex-col gap-3">
          <Field label="Access Token">
            <Input
              type="password"
              name="mpAccessToken"
              placeholder={configurado ? "•••••••••••• (colar novo para trocar)" : "APP_USR-..."}
              autoComplete="off"
            />
          </Field>
          <Field label="Public Key (opcional)">
            <Input
              name="mpPublicKey"
              defaultValue={revendedor.mpPublicKey ?? ""}
              placeholder="APP_USR-..."
              autoComplete="off"
            />
          </Field>
          <Button type="submit" className="mt-1 w-full">
            Salvar credenciais
          </Button>
        </form>
      </Card>
    </div>
  );
}
