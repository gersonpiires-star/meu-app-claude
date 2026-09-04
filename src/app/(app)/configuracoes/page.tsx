import Link from "next/link";
import { exigirRevendedor, souFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { salvarCredenciaisMP, salvarSuspensaoAutomatica } from "./actions";
import { ImportarForm } from "./importar-form";
import { ChavesPixForm } from "./chaves-pix-form";
import { BackupForm } from "./backup-form";
import { NotificacoesPush } from "./notificacoes-push";
import { LinkIndicacao } from "./link-indicacao";
import { CancelarAssinaturaForm } from "./cancelar-assinatura-form";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export default async function ConfiguracoesPage() {
  const revendedor = await exigirRevendedor();
  const ehFuncionario = await souFuncionario();
  const configurado = Boolean(revendedor.mpAccessToken);
  const [chaves, indicadosCount] = await Promise.all([
    prisma.chavePix.findMany({ where: { revendedorId: revendedor.id }, orderBy: { criadoEm: "desc" } }),
    prisma.revendedor.count({ where: { indicadoPorId: revendedor.id } }),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Configurações</h1>

      {ehFuncionario ? null : (
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
      )}

      {ehFuncionario ? null : (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-text">Funcionários</h2>
              <p className="mt-1 text-sm text-text-dim">Dê acesso ao app pra quem te ajuda a atender.</p>
            </div>
            <Link href="/configuracoes/funcionarios">
              <Button variant="ghost">Gerenciar</Button>
            </Link>
          </div>
        </Card>
      )}

      {ehFuncionario ? null : (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-text">Histórico de ações</h2>
              <p className="mt-1 text-sm text-text-dim">Veja o que você e seus funcionários andaram fazendo.</p>
            </div>
            <Link href="/configuracoes/historico">
              <Button variant="ghost">Ver histórico</Button>
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-sm font-bold text-text">Lembrete diário de vencimento</h2>
        <p className="mb-3 text-sm text-text-dim">
          Receba uma notificação toda manhã no celular ou computador com quem está vencendo ou vencido —
          sem precisar abrir o app pra conferir.
        </p>
        <NotificacoesPush />
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-bold text-text">Suspensão automática</h2>
        <p className="mb-3 text-sm text-text-dim">
          Cancela sozinho o cliente que ficar vencido por mais do que esse número de dias. Deixe em
          branco para nunca cancelar automaticamente.
        </p>
        <form action={salvarSuspensaoAutomatica} className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Dias de tolerância após o vencimento">
              <Input
                type="number"
                name="diasParaCancelarAutomatico"
                min={1}
                placeholder="Ex: 10"
                defaultValue={revendedor.diasParaCancelarAutomatico ?? ""}
              />
            </Field>
          </div>
          <Button type="submit">Salvar</Button>
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
        <BackupForm podeRestaurar={!ehFuncionario} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-text">Trazer dados de outro sistema</h2>
        <ImportarForm />
      </Card>

      {ehFuncionario ? null : (
        <Card>
          <h2 className="mb-1 text-sm font-bold text-text">Indique o GestorPro</h2>
          <p className="mb-3 text-sm text-text-dim">
            Compartilhe seu link — quem se cadastrar por ele fica marcado como indicado por você.
            {indicadosCount > 0
              ? ` Você já indicou ${indicadosCount} pessoa${indicadosCount === 1 ? "" : "s"}.`
              : ""}
          </p>
          <LinkIndicacao link={`${baseUrl()}/cadastro?ref=${revendedor.id}`} />
        </Card>
      )}

      {ehFuncionario ? null : (
        <Card>
          <h2 className="mb-1 text-sm font-bold text-text">Cancelar assinatura</h2>
          <p className="mb-3 text-sm text-text-dim">Se decidir sair, seus dados continuam guardados.</p>
          <CancelarAssinaturaForm />
        </Card>
      )}
    </div>
  );
}
