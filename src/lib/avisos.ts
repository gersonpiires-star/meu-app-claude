import { prisma } from "@/lib/prisma";

export type NotificacaoRevendedor =
  | { tipo: "COMUNICADO"; id: string; titulo: string; mensagem: string; criadoEm: Date; lido: boolean }
  | { tipo: "PAGAMENTO"; id: string; clienteId: string | null; clienteNome: string; valor: number; criadoEm: Date; lido: boolean };

// Alimenta o sininho de notificação do painel do revendedor com dois tipos
// de evento: comunicados da Administração GestorPro (Aviso, destino
// TODOS_REVENDEDORES) e avisos de pagamento de cliente recebido sozinho
// pelo link (/pagar/[clienteId]). "lido" é calculado comparando com
// Revendedor.avisosLidosAte pros dois tipos juntos — é só um sininho, não
// precisa granularidade de ler item por item.
export async function notificacoesParaRevendedor(revendedor: { id: string; avisosLidosAte: Date | null }) {
  const [avisos, pagamentos] = await Promise.all([
    prisma.aviso.findMany({
      where: { destino: "TODOS_REVENDEDORES" },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
    prisma.notificacaoPagamento.findMany({
      where: { revendedorId: revendedor.id },
      orderBy: { criadoEm: "desc" },
      take: 20,
    }),
  ]);

  const lidosAte = revendedor.avisosLidosAte;
  const lido = (criadoEm: Date) => lidosAte != null && criadoEm <= lidosAte;

  const lista: NotificacaoRevendedor[] = [
    ...avisos.map((a): NotificacaoRevendedor => ({
      tipo: "COMUNICADO",
      id: a.id,
      titulo: a.titulo,
      mensagem: a.mensagem,
      criadoEm: a.criadoEm,
      lido: lido(a.criadoEm),
    })),
    ...pagamentos.map((p): NotificacaoRevendedor => ({
      tipo: "PAGAMENTO",
      id: p.id,
      clienteId: p.clienteId,
      clienteNome: p.clienteNome,
      valor: p.valor,
      criadoEm: p.criadoEm,
      lido: lido(p.criadoEm),
    })),
  ].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());

  return { notificacoes: lista, naoLidos: lista.filter((n) => !n.lido).length };
}
