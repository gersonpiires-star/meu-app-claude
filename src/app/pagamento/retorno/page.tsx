import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

const TEXTO_STATUS: Record<string, { titulo: string; badge: "accent" | "warning" | "danger"; texto: string }> = {
  APROVADO: {
    titulo: "Pagamento aprovado!",
    badge: "accent",
    texto: "Seu plano já foi renovado. Obrigado!",
  },
  PENDENTE: {
    titulo: "Pagamento em processamento",
    badge: "warning",
    texto: "Assim que for confirmado (o Pix pode levar alguns minutos), seu plano é renovado automaticamente.",
  },
  RECUSADO: {
    titulo: "Pagamento não aprovado",
    badge: "danger",
    texto: "Não foi possível confirmar o pagamento. Você pode tentar novamente ou falar com quem te atende.",
  },
  CANCELADO: {
    titulo: "Pagamento cancelado",
    badge: "danger",
    texto: "Esse pagamento foi cancelado.",
  },
};

export default async function RetornoPagamentoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ pagamentoId?: string }>;
}) {
  const { pagamentoId } = await searchParams;
  if (!pagamentoId) notFound();

  const pagamento = await prisma.pagamento.findUnique({ where: { id: pagamentoId } });
  if (!pagamento) notFound();

  const info = TEXTO_STATUS[pagamento.status] ?? TEXTO_STATUS.PENDENTE;

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-bg px-4 py-10 text-text">
      <Card className="w-full max-w-sm text-center">
        <Badge tone={info.badge}>{pagamento.status}</Badge>
        <h1 className="mt-3 text-lg font-bold text-text">{info.titulo}</h1>
        <p className="mt-2 text-sm text-text-dim">{info.texto}</p>
        <p className="mt-4 text-xs text-text-dim">Valor: {brl(pagamento.valor)}</p>
      </Card>
    </main>
  );
}
