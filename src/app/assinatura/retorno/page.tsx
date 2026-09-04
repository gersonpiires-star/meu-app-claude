import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card } from "@/components/ui";

const TEXTO_STATUS: Record<string, { titulo: string; badge: "accent" | "warning" | "danger"; texto: string }> = {
  APROVADO: {
    titulo: "Pagamento aprovado!",
    badge: "accent",
    texto: "Seu acesso já está liberado. Bom trabalho!",
  },
  PENDENTE: {
    titulo: "Pagamento em processamento",
    badge: "warning",
    texto: "Assim que o Mercado Pago confirmar (pode levar alguns minutos, especialmente no Pix), seu acesso é liberado automaticamente.",
  },
  RECUSADO: {
    titulo: "Pagamento não aprovado",
    badge: "danger",
    texto: "O Mercado Pago recusou o pagamento. Você pode tentar novamente ou pagar via Pix pelo WhatsApp.",
  },
  CANCELADO: {
    titulo: "Pagamento cancelado",
    badge: "danger",
    texto: "Esse pagamento foi cancelado. Você pode tentar novamente quando quiser.",
  },
};

export default async function RetornoAssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagamentoId?: string }>;
}) {
  const revendedor = await exigirRevendedor();
  const { pagamentoId } = await searchParams;
  if (!pagamentoId) notFound();

  const pagamento = await prisma.pagamento.findUnique({
    where: { id: pagamentoId, revendedorId: revendedor.id },
  });
  if (!pagamento) notFound();

  const info = TEXTO_STATUS[pagamento.status] ?? TEXTO_STATUS.PENDENTE;

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <Badge tone={info.badge}>{pagamento.status}</Badge>
        <h1 className="mt-3 text-lg font-bold text-text">{info.titulo}</h1>
        <p className="mt-2 text-sm text-text-dim">{info.texto}</p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Link href="/painel">
            <Button className="w-full">Ir para o painel</Button>
          </Link>
          {pagamento.status !== "APROVADO" ? (
            <Link href="/assinatura" className="text-xs text-text-dim hover:text-text">
              Voltar aos planos
            </Link>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
