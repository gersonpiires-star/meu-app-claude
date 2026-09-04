import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { SairButton } from "@/components/sair-button";

type Motivo = "PAUSADO" | "CANCELADO" | "TRIAL_VENCIDO" | "ASSINATURA_VENCIDA";

const CONTEUDO: Record<Motivo, { titulo: string; texto: string; botao: string }> = {
  PAUSADO: {
    titulo: "Acesso pausado",
    texto: "Seus dados continuam guardados e voltam assim que o acesso for liberado.",
    botao: "Ver planos",
  },
  CANCELADO: {
    titulo: "Assinatura cancelada",
    texto: "Seus dados continuam guardados. Assine de novo quando quiser voltar a usar o GestorPro.",
    botao: "Assinar de novo",
  },
  TRIAL_VENCIDO: {
    titulo: "Seu teste grátis venceu",
    texto: "Seus dados continuam guardados e você tem acesso a tudo que já cadastrou assim que assinar. Vamos renovar?",
    botao: "Vamos renovar",
  },
  ASSINATURA_VENCIDA: {
    titulo: "Plano vencido",
    texto: "Seus dados continuam guardados e você tem acesso a tudo que já cadastrou assim que renovar. Vamos renovar?",
    botao: "Vamos renovar",
  },
};

export function AcessoPausado({ nome, motivo = "PAUSADO" }: { nome: string; motivo?: Motivo }) {
  const conteudo = CONTEUDO[motivo];

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-warning-bg text-warning" />
        <h1 className="text-lg font-bold text-text">{conteudo.titulo}</h1>
        <p className="mt-2 text-sm text-text-dim">
          Olá, {nome}. {conteudo.texto}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/assinatura">
            <Button className="w-full">{conteudo.botao}</Button>
          </Link>
          <SairButton className="text-xs font-semibold text-text-dim hover:text-danger" />
        </div>
      </Card>
    </main>
  );
}
