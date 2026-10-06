import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/logo-mark";

export const metadata: Metadata = {
  title: "Termos de Uso — GestorPro",
  description: "Termos de uso do GestorPro.",
};

// ATENÇÃO (comentário interno, não aparece na página): os campos marcados
// [PREENCHER: ...] abaixo são dados de identificação da empresa que só o
// dono do GestorPro tem (razão social, CNPJ, endereço) — o resto do
// conteúdo já reflete o que o app faz de verdade. Recomendo revisão de um
// advogado antes de tratar isso como versão final, principalmente a parte
// de LGPD/privacidade.
const EMPRESA = "[PREENCHER: Razão social] (\"GestorPro\")";
const CNPJ = "[PREENCHER: CNPJ]";
const ENDERECO = "[PREENCHER: endereço completo]";
const EMAIL_CONTATO = "[PREENCHER: e-mail de contato]";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-text">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-text-muted">{children}</div>
    </section>
  );
}

export default function TermosPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="text-sm font-bold text-text">GestorPro</span>
        </Link>
        <Link href="/" className="text-xs font-semibold text-text-dim hover:text-text">
          ‹ Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-extrabold text-text">Termos de Uso</h1>
        <p className="mt-1 text-xs text-text-dim">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
      </div>

      <Secao titulo="1. Quem oferece o serviço">
        <p>
          O GestorPro é oferecido por {EMPRESA}, inscrita no CNPJ {CNPJ}, com sede em {ENDERECO}. Ao criar uma conta
          ou usar o GestorPro, você concorda com estes Termos de Uso e com a{" "}
          <Link href="/privacidade" className="font-semibold text-accent">
            Política de Privacidade
          </Link>
          .
        </p>
      </Secao>

      <Secao titulo="2. O que é o GestorPro">
        <p>
          O GestorPro é um software (SaaS) de gestão para quem revende acesso a plataformas de streaming/IPTV —
          cadastro de clientes, controle de vencimentos e cobrança, controle de créditos/estoque, vendas e relatório
          financeiro. O GestorPro não é uma plataforma de streaming, não fornece acesso a nenhum conteúdo audiovisual
          e não tem relação com as plataformas que você, revendedor, eventualmente usa como fornecedor de créditos.
        </p>
      </Secao>

      <Secao titulo="3. Cadastro, conta e trial">
        <p>
          Você precisa fornecer dados verdadeiros no cadastro e é responsável por manter sua senha em sigilo e por
          toda atividade feita com a sua conta, inclusive por funcionários que você cadastrar. O GestorPro oferece um
          período de teste gratuito (atualmente 7 dias, sem necessidade de cartão de crédito); ao fim do período, é
          preciso assinar um plano pago para continuar usando.
        </p>
      </Secao>

      <Secao titulo="4. Planos, cobrança e cancelamento">
        <p>
          Os planos disponíveis (mensal, semestral, anual) e seus preços são exibidos na página de assinatura dentro
          do app. O pagamento é processado por um provedor de pagamento terceiro (Mercado Pago ou Asaas, conforme
          disponibilidade) — o GestorPro não armazena dados completos de cartão de crédito. Não há fidelidade: você
          pode cancelar sua assinatura quando quiser, direto no app, e o acesso continua disponível até o fim do
          período já pago. Não há reembolso proporcional de período já iniciado, salvo quando exigido por lei.
        </p>
      </Secao>

      <Secao titulo="5. Uso aceitável">
        <p>
          Você é o único responsável pelos dados de clientes finais que cadastra no GestorPro (nome, WhatsApp, CPF
          quando informado, plano e valor) e precisa ter base legal para tratá-los — por exemplo, o próprio
          relacionamento comercial com esse cliente. É proibido usar o GestorPro para fins ilegais, para enviar spam
          ou mensagens não solicitadas, ou para tentar acessar dados de outras contas sem autorização.
        </p>
      </Secao>

      <Secao titulo="6. Seus dados, sua propriedade">
        <p>
          Os dados que você cadastra (clientes, vendas, estoque, relatórios) são seus. Você pode exportá-los a
          qualquer momento pelas ferramentas de exportação do próprio app, e pode pedir a exclusão da sua conta e dos
          dados associados a ela — veja a{" "}
          <Link href="/privacidade" className="font-semibold text-accent">
            Política de Privacidade
          </Link>{" "}
          para os detalhes e prazos.
        </p>
      </Secao>

      <Secao titulo="7. Disponibilidade e integrações de terceiros">
        <p>
          O GestorPro é fornecido &quot;como está&quot;, sem garantia de disponibilidade ininterrupta — fazemos o
          possível para manter o serviço no ar, mas eventuais integrações com terceiros (como o envio de mensagens
          via WhatsApp, Mercado Pago, Asaas ou plataformas de crédito que você conectar) dependem desses serviços
          externos e podem falhar ou mudar de comportamento sem aviso prévio nosso.
        </p>
      </Secao>

      <Secao titulo="8. Encerramento de conta">
        <p>
          Você pode encerrar sua conta quando quiser. Podemos suspender ou encerrar contas que violem estes Termos,
          que fiquem inadimplentes além do prazo de tolerância informado no app, ou por determinação legal, avisando
          sempre que possível com antecedência razoável.
        </p>
      </Secao>

      <Secao titulo="9. Alterações nestes Termos">
        <p>
          Podemos atualizar estes Termos de tempos em tempos. Mudanças relevantes serão avisadas no próprio app ou
          por e-mail/WhatsApp cadastrado. O uso continuado do GestorPro depois de uma atualização vale como
          concordância com os novos termos.
        </p>
      </Secao>

      <Secao titulo="10. Lei aplicável">
        <p>
          Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de{" "}
          {"[PREENCHER: comarca/cidade]"} para dirimir eventuais controvérsias, com renúncia a qualquer outro, por
          mais privilegiado que seja.
        </p>
      </Secao>

      <Secao titulo="11. Contato">
        <p>Dúvidas sobre estes Termos: {EMAIL_CONTATO}.</p>
      </Secao>
    </main>
  );
}
