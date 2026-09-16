import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { CardRetratil } from "@/components/ui";

const WHATSAPP_SUPORTE = process.env.SUPORTE_WHATSAPP ?? "5500000000000";

export default async function AjudaPage() {
  await exigirRevendedor();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3">
      <div>
        <h1 className="text-lg font-bold text-text">Central de ajuda</h1>
        <p className="text-xs text-text-dim">
          Respostas rápidas pras dúvidas mais comuns. Pra tudo em detalhe, veja o{" "}
          <a href="/manual-revendedor.pdf" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent">
            manual completo
          </a>
          .
        </p>
      </div>

      <CardRetratil titulo="Como cadastro um cliente novo?">
        <p className="text-sm text-text-dim">
          Vá em <Link href="/clientes/novo" className="font-semibold text-accent">Clientes → Novo cliente</Link>. Informe
          o app/serviço, o plano e o valor — o vencimento é calculado automaticamente a partir da data de hoje e do
          plano escolhido. Se o cliente tiver um dia fixo de vencimento (ex: sempre dia 10), preencha o campo
          &quot;Dia fixo&quot;.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Como faço pra cobrar quem está vencendo ou já venceu?">
        <p className="text-sm text-text-dim">
          Em <Link href="/clientes/cobrar-em-lote" className="font-semibold text-accent">Clientes → Cobrar em lote</Link>{" "}
          aparece a fila de quem precisa ser cobrado, já com a mensagem pronta (incluindo Pix, se você tiver uma chave
          cadastrada) — só falta abrir o WhatsApp e enviar. Você também recebe um lembrete automático todo dia, se
          ativar em Configurações → Lembrete diário.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Como recebo pagamento por Pix?">
        <p className="text-sm text-text-dim">
          Cadastre sua chave em <Link href="/configuracoes" className="font-semibold text-accent">Configurações → Chaves Pix</Link>.
          A partir daí, toda cobrança e a página pública de pagamento do cliente já mostram um QR code e o código
          &quot;Copia e Cola&quot; com o valor certo embutido — o cliente só precisa colar no app do banco dele, sem
          digitar nada.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Preciso configurar o Mercado Pago pra usar o app?">
        <p className="text-sm text-text-dim">
          Não — funciona com só uma chave Pix cadastrada. O Mercado Pago (em Configurações) é opcional e serve pra
          quem quer aceitar cartão também, ou automatizar 100% o pagamento online (o cliente paga e a renovação
          acontece sozinha, sem você precisar confirmar nada).
        </p>
      </CardRetratil>

      <CardRetratil titulo="O que acontece se um cliente não pagar?">
        <p className="text-sm text-text-dim">
          Nada automático por padrão — o cliente só fica marcado como &quot;Vencido&quot; até você agir. Se quiser que
          o app cancele sozinho depois de X dias de atraso, configure em Configurações → Suspensão automática.
        </p>
      </CardRetratil>

      <CardRetratil titulo="O que é a 'Pontualidade' que aparece no cliente?">
        <p className="text-sm text-text-dim">
          É quantas cobranças em média você precisa enviar pra cada renovação daquele cliente — de &quot;Paga
          sozinho&quot; (não precisa nem lembrar) até &quot;Só paga cobrado&quot; (só renova depois de insistir). Ajuda
          a saber quem merece mais atenção antes do vencimento.
        </p>
      </CardRetratil>

      <CardRetratil titulo="O que significa 'Cliente esfriando' no Painel?">
        <p className="text-sm text-text-dim">
          É um aviso pra clientes que historicamente só renovam depois de cobrança repetida e cujo ciclo está
          terminando agora — momento em que esse tipo de cliente mais costuma cancelar sem avisar. Vale a pena
          chamar esses primeiro.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Como funciona o período de teste?">
        <p className="text-sm text-text-dim">
          Você tem 7 dias de trial com acesso completo, sem cartão de crédito. Um checklist de primeiros passos
          aparece no Painel enquanto você não cadastra pelo menos um app, um cliente e uma chave Pix. Depois do
          trial, é preciso assinar em <Link href="/assinatura" className="font-semibold text-accent">Assinatura</Link>{" "}
          pra continuar usando.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Esqueci minha senha, e agora?">
        <p className="text-sm text-text-dim">
          Na tela de login, clique em &quot;Esqueci minha senha&quot; e informe seu e-mail — um link de redefinição
          chega por e-mail e vale por 1 hora. Se não chegar, confira a caixa de spam.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Como faço backup dos meus dados?">
        <p className="text-sm text-text-dim">
          Em <Link href="/configuracoes" className="font-semibold text-accent">Configurações → Backup em arquivo</Link>{" "}
          você exporta uma cópia completa (clientes, vendas, plataformas, pagamentos) em JSON, ou só os clientes em
          CSV pra abrir numa planilha. Guarde esse arquivo em outro lugar — a nuvem não guarda versões antigas.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Posso dar acesso ao sistema pra quem me ajuda a atender?">
        <p className="text-sm text-text-dim">
          Sim — em <Link href="/configuracoes/funcionarios" className="font-semibold text-accent">Configurações → Funcionários</Link>{" "}
          você cadastra um login próprio pra cada pessoa. Funcionários não veem suas credenciais de pagamento nem
          conseguem gerenciar outros funcionários.
        </p>
      </CardRetratil>

      <CardRetratil titulo="Dá pra automatizar 100% o envio de cobrança pelo WhatsApp?">
        <p className="text-sm text-text-dim">
          Ainda não — hoje o app prepara a mensagem pronta (com Pix incluso), mas quem aperta &quot;enviar&quot; dentro
          do WhatsApp é você. Isso é uma limitação do próprio WhatsApp comum, não do GestorPro; o envio totalmente
          automático depende de uma integração oficial da Meta que estamos preparando.
        </p>
      </CardRetratil>

      <div className="mt-2 rounded-2xl border border-border-strong bg-surface-2 p-4 text-center">
        <p className="text-sm text-text-dim">Não achou o que precisava?</p>
        <a
          href={`https://wa.me/${WHATSAPP_SUPORTE}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-sm font-semibold text-accent"
        >
          Fale com o suporte do GestorPro
        </a>
      </div>
    </div>
  );
}
