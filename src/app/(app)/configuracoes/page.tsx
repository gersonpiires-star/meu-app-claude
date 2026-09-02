import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { salvarCredenciaisMP } from "./actions";
import { ImportarForm } from "./importar-form";
import { ChavesPixForm } from "./chaves-pix-form";
import { BackupForm } from "./backup-form";

export default async function ConfiguracoesPage() {
  const revendedor = await exigirRevendedor();
  const configurado = Boolean(revendedor.mpAccessToken);
  const chaves = await prisma.chavePix.findMany({ where: { revendedorId: revendedor.id }, orderBy: { criadoEm: "desc" } });

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

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Modelos de mensagem</h2>
            <p className="mt-1 text-sm text-text-dim">Personalize os textos de cobrança e comunicado.</p>
          </div>
          <Link href="/configuracoes/modelos">
            <Button variant="ghost">Editar</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Chaves Pix</h2>
        <p className="mb-3 text-sm text-text-dim">
          Cadastre suas chaves pra anexar na mensagem de cobrança que vai pro cliente.
        </p>
        <ChavesPixForm chaves={chaves} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Backup em arquivo</h2>
        <p className="mb-3 text-sm text-text-dim">
          Cópia congelada dos seus dados — a nuvem não guarda histórico de versões antigas.
        </p>
        <BackupForm />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Trazer dados de outro sistema</h2>
        <ImportarForm />
      </Card>
    </div>
  );
}
