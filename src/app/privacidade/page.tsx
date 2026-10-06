import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/logo-mark";

export const metadata: Metadata = {
  title: "Política de Privacidade — GestorPro",
  description: "Política de privacidade do GestorPro.",
};

// Mesma observação de src/app/termos/page.tsx: campos [PREENCHER: ...] são
// dados de identificação da empresa (razão social, CNPJ, encarregado/DPO) —
// o resto reflete o que o app realmente coleta e faz com os dados, a partir
// do schema do banco e dos fluxos existentes. Revisão jurídica recomendada
// antes de publicar como versão final, principalmente a seção de LGPD.
const EMPRESA = "[PREENCHER: Razão social] (\"GestorPro\")";
const CNPJ = "[PREENCHER: CNPJ]";
const EMAIL_CONTATO = "[PREENCHER: e-mail de contato]";
const EMAIL_ENCARREGADO = "[PREENCHER: e-mail do encarregado de dados / DPO]";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-text">{titulo}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-text-muted">{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
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
        <h1 className="text-2xl font-extrabold text-text">Política de Privacidade</h1>
        <p className="mt-1 text-xs text-text-dim">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>
      </div>

      <Secao titulo="1. Quem trata seus dados">
        <p>
          {EMPRESA}, CNPJ {CNPJ}, é a controladora dos dados cadastrais de quem usa o GestorPro (você, revendedor, e
          seus funcionários cadastrados). Para os dados dos clientes finais que você cadastra no app, você é o
          controlador e o GestorPro atua como operador — ver seção 6.
        </p>
      </Secao>

      <Secao titulo="2. Quais dados coletamos">
        <p>Da sua conta: nome, e-mail, WhatsApp, CPF (opcional), senha (guardada com hash, nunca em texto puro).</p>
        <p>
          Dados de uso: páginas acessadas e ações relevantes dentro do app (ex: renovação de cliente, alteração de
          configuração), para manter um histórico de atividade da sua conta e para segurança (ex: detectar tentativa
          de login indevida).
        </p>
        <p>
          Dados de pagamento: quando você assina um plano, o processamento do pagamento é feito pelo Mercado Pago ou
          Asaas — não armazenamos número completo de cartão de crédito.
        </p>
        <p>
          Se você ativar notificações push, armazenamos a inscrição técnica do navegador necessária para o envio
          (sem isso não é possível mandar a notificação).
        </p>
      </Secao>

      <Secao titulo="3. Como usamos os dados">
        <p>
          Para operar o serviço (manter sua conta, calcular vencimentos, gerar relatórios), processar pagamento da
          sua assinatura, enviar e-mails e notificações relacionados à conta (recuperação de senha, avisos,
          lembretes), dar suporte quando você entra em contato, e cumprir obrigações legais.
        </p>
      </Secao>

      <Secao titulo="4. Com quem compartilhamos">
        <p>Não vendemos seus dados. Compartilhamos o mínimo necessário com:</p>
        <ul className="list-disc pl-5">
          <li>Mercado Pago e Asaas — processamento de pagamento da sua assinatura e, se você conectar, dos pagamentos dos seus clientes.</li>
          <li>Vercel e Supabase — hospedagem da aplicação e do banco de dados.</li>
          <li>Resend — envio de e-mails transacionais (recuperação de senha, comunicados).</li>
          <li>Sentry — monitoramento de erros técnicos (não recebe senha nem dado de pagamento).</li>
          <li>Meta (WhatsApp Cloud API), se você conectar o autoatendimento por WhatsApp.</li>
        </ul>
      </Secao>

      <Secao titulo="5. Cookies e sessão">
        <p>
          Usamos um cookie técnico de sessão para manter você conectado (expira ao fechar o navegador, a menos que
          você marque &quot;manter conectado&quot; no login) e armazenamento local do navegador para lembrar sua
          preferência de tema (claro/escuro). Não usamos cookies de rastreamento ou publicidade de terceiros.
        </p>
      </Secao>

      <Secao titulo="6. Dados dos seus clientes (que você cadastra)">
        <p>
          Nome, WhatsApp, CPF (quando informado), plano e valor dos clientes que você gerencia no GestorPro são
          tratados por sua conta e risco, como controlador desses dados — o GestorPro atua só como operador técnico
          (armazena e processa conforme suas instruções, ex: enviar uma cobrança que você configurou). Cabe a você
          garantir que tem base legal (LGPD) para tratar os dados dos seus próprios clientes.
        </p>
      </Secao>

      <Secao titulo="7. Segurança">
        <p>
          Senhas são guardadas com hash (bcrypt), nunca em texto puro. Credenciais de integração sensíveis (token do
          WhatsApp, do Mercado Pago/Asaas, senha de plataformas de crédito conectadas) são guardadas criptografadas.
          Toda comunicação com o app é feita por HTTPS. Mesmo com essas medidas, nenhum sistema é 100% livre de
          risco — se identificarmos um incidente de segurança que afete seus dados, vamos te avisar conforme exigido
          pela LGPD.
        </p>
      </Secao>

      <Secao titulo="8. Por quanto tempo guardamos os dados">
        <p>
          Enquanto sua conta existir. Se você pedir o encerramento da conta, excluímos os dados pessoais em prazo
          razoável, exceto o que precisarmos manter por obrigação legal (ex: registro fiscal de pagamento já
          recebido).
        </p>
      </Secao>

      <Secao titulo="9. Seus direitos (LGPD)">
        <p>Você pode, a qualquer momento, pedir:</p>
        <ul className="list-disc pl-5">
          <li>Confirmação de que tratamos seus dados, e acesso a eles.</li>
          <li>Correção de dado incompleto, inexato ou desatualizado.</li>
          <li>Exportação dos seus dados (disponível direto no app, em Configurações).</li>
          <li>Exclusão dos seus dados pessoais, quando não houver obrigação legal de retê-los.</li>
          <li>Informação sobre com quem compartilhamos seus dados.</li>
        </ul>
        <p>
          Pra exercer esses direitos, escreva para {EMAIL_ENCARREGADO} ou {EMAIL_CONTATO}.
        </p>
      </Secao>

      <Secao titulo="10. Alterações nesta política">
        <p>
          Podemos atualizar esta política de tempos em tempos. Mudanças relevantes serão avisadas no app ou pelo
          e-mail/WhatsApp cadastrado.
        </p>
      </Secao>

      <Secao titulo="11. Contato">
        <p>Dúvidas sobre privacidade: {EMAIL_CONTATO}.</p>
      </Secao>
    </main>
  );
}
