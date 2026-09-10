import Link from "next/link";
import { exigirRevendedor, souFuncionario } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Badge, Button, CardRetratil, Field, Input } from "@/components/ui";
import { salvarCredenciaisMP, salvarSuspensaoAutomatica } from "./actions";
import { PerfilForm } from "./perfil-form";
import { ImportarForm } from "./importar-form";
import { ChavesPixForm } from "./chaves-pix-form";
import { BackupForm } from "./backup-form";
import { NotificacoesPush } from "./notificacoes-push";
import { LinkIndicacao } from "./link-indicacao";
import { CancelarAssinaturaForm } from "./cancelar-assinatura-form";
import { SugestaoForm } from "./sugestao-form";
import { UnitvForm } from "./unitv-form";

function baseUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// Integração UniTV ainda é um teste não verificado (ver
// src/lib/integracoes/unitv.ts) — só aparece pro dono do GestorPro por
// enquanto, a pedido dele, até ficar confiável o suficiente pra outros
// revendedores verem.
const EMAIL_BETA_UNITV = "gersonpiires@gmail.com";

// Pausado a pedido do dono enquanto se espera a resposta da UniTV sobre uma
// API oficial — o card fica escondido (mas o código continua todo aqui) até
// virar true de novo.
const INTEGRACAO_UNITV_ATIVA = false;

export default async function ConfiguracoesPage() {
  const revendedor = await exigirRevendedor();
  const ehFuncionario = await souFuncionario();
  const podeVerBetaUnitv = INTEGRACAO_UNITV_ATIVA && revendedor.email === EMAIL_BETA_UNITV;
  const configurado = Boolean(revendedor.mpAccessToken);
  const [chaves, indicadosCount] = await Promise.all([
    prisma.chavePix.findMany({ where: { revendedorId: revendedor.id }, orderBy: { criadoEm: "desc" } }),
    prisma.revendedor.count({ where: { indicadoPorId: revendedor.id } }),
  ]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3">
      <h1 className="mb-2 text-lg font-bold text-text">Configurações</h1>

      {ehFuncionario ? null : (
        <CardRetratil titulo="Seus dados">
          <PerfilForm nome={revendedor.nome} whatsapp={revendedor.whatsapp} />
        </CardRetratil>
      )}

      {ehFuncionario ? null : (
        <CardRetratil
          titulo="Receber pagamentos online (Mercado Pago)"
          extra={configurado ? <Badge tone="accent">Configurado</Badge> : <Badge tone="neutral">Não configurado</Badge>}
        >
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
        </CardRetratil>
      )}

      {ehFuncionario ? null : (
        <CardRetratil titulo="Funcionários">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-dim">Dê acesso ao app pra quem te ajuda a atender.</p>
            <Link href="/configuracoes/funcionarios">
              <Button variant="ghost">Gerenciar</Button>
            </Link>
          </div>
        </CardRetratil>
      )}

      {ehFuncionario ? null : (
        <CardRetratil titulo="Histórico de ações">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-dim">Veja o que você e seus funcionários andaram fazendo.</p>
            <Link href="/configuracoes/historico">
              <Button variant="ghost">Ver histórico</Button>
            </Link>
          </div>
        </CardRetratil>
      )}

      <CardRetratil titulo="Lembrete diário de vencimento">
        <p className="mb-3 text-sm text-text-dim">
          Receba uma notificação toda manhã no celular ou computador com quem está vencendo ou vencido —
          sem precisar abrir o app pra conferir.
        </p>
        <NotificacoesPush />
      </CardRetratil>

      <CardRetratil titulo="Suspensão automática">
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
      </CardRetratil>

      <CardRetratil titulo="Modelos de mensagem">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-dim">Personalize os textos de cobrança e comunicado.</p>
          <Link href="/configuracoes/modelos">
            <Button variant="ghost">Editar</Button>
          </Link>
        </div>
      </CardRetratil>

      {ehFuncionario ? null : (
        <CardRetratil titulo="Chaves Pix">
          <p className="mb-3 text-sm text-text-dim">
            Cadastre suas chaves pra anexar na mensagem de cobrança que vai pro cliente.
          </p>
          <ChavesPixForm chaves={chaves} />
        </CardRetratil>
      )}

      <CardRetratil titulo="Backup em arquivo">
        <p className="mb-3 text-sm text-text-dim">
          Cópia congelada dos seus dados — a nuvem não guarda histórico de versões antigas.
        </p>
        <BackupForm podeRestaurar={!ehFuncionario} />
      </CardRetratil>

      <CardRetratil titulo="Trazer dados de outro sistema">
        <ImportarForm podeZerar={!ehFuncionario} />
      </CardRetratil>

      {ehFuncionario || !podeVerBetaUnitv ? null : (
        <CardRetratil titulo="Integração UniTV" extra={<Badge tone="warning">Beta</Badge>}>
          <p className="mb-3 text-sm text-text-dim">
            Conecte sua conta de revenda da UniTV pra, no futuro, renovar clientes direto pelo GestorPro sem
            abrir o painel deles. A UniTV não tem API oficial — essa integração é experimental e pode falhar
            ou parar de funcionar sem aviso.
          </p>
          <UnitvForm usuarioAtual={revendedor.unitvUsuario} conectadoEm={revendedor.unitvConectadoEm} />
        </CardRetratil>
      )}

      {ehFuncionario ? null : (
        <CardRetratil titulo="Indique o GestorPro">
          <p className="mb-3 text-sm text-text-dim">
            Compartilhe seu link — quando a pessoa se cadastrar por ele e assinar o primeiro plano pago, você
            ganha automaticamente um cupom de 15% de desconto pra usar na sua próxima renovação.
            {indicadosCount > 0
              ? ` Você já indicou ${indicadosCount} pessoa${indicadosCount === 1 ? "" : "s"}.`
              : ""}
          </p>
          <LinkIndicacao link={`${baseUrl()}/cadastro?ref=${revendedor.id}`} />
        </CardRetratil>
      )}

      <CardRetratil titulo="Sugestões pro time do GestorPro">
        <p className="mb-3 text-sm text-text-dim">Tem alguma dica de melhoria ou ajuste que faria diferença no seu dia a dia? Conta pra gente.</p>
        <SugestaoForm />
      </CardRetratil>

      {ehFuncionario ? null : (
        <CardRetratil titulo="Cancelar assinatura">
          <p className="mb-3 text-sm text-text-dim">Se decidir sair, seus dados continuam guardados.</p>
          <CancelarAssinaturaForm />
        </CardRetratil>
      )}
    </div>
  );
}
