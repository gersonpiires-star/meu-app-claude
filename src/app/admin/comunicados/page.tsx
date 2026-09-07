import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { ExcluirAvisoBotao } from "./excluir-aviso-botao";
import { PublicarAvisoForm } from "./publicar-aviso-form";

export default async function ComunicadosPage() {
  await exigirAdmin();
  const [avisos, revendedores, cupons] = await Promise.all([
    prisma.aviso.findMany({
      where: { destino: { in: ["TODOS_REVENDEDORES", "UM_REVENDEDOR"] } },
      include: { revendedor: { select: { nome: true, email: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true, statusAssinatura: true },
    }),
    prisma.cupom.findMany({
      where: { ativo: true },
      orderBy: { criadoEm: "desc" },
    }),
  ]);

  // Só oferece pra gerar mensagem os cupons que ainda valem de fato —
  // um cupom expirado ou esgotado não deveria virar um comunicado novo.
  const cuponsValidos = cupons
    .filter((c) => {
      const expirado = c.validoAte ? c.validoAte < new Date() : false;
      const esgotado = c.usoMaximo != null && c.usosCount >= c.usoMaximo;
      return !expirado && !esgotado;
    })
    .map((c) => ({ id: c.id, codigo: c.codigo, tipo: c.tipo, valor: c.valor, revendedorId: c.revendedorId }));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Comunicados</h1>

      <PublicarAvisoForm revendedores={revendedores} cupons={cuponsValidos} />

      {avisos.length === 0 ? (
        <EmptyState>Nenhum comunicado publicado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {avisos.map((aviso) => (
            <Card key={aviso.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-text">{aviso.titulo}</p>
                  {aviso.revendedor ? (
                    <Badge tone="accent">Para {aviso.revendedor.nome}</Badge>
                  ) : (
                    <Badge tone="neutral">Para todos</Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-text-dim">{dataPorExtenso(aviso.criadoEm)}</span>
                  <ExcluirAvisoBotao id={aviso.id} />
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{aviso.mensagem}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
