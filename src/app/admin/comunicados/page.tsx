import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso } from "@/lib/format";
import { DestinoAviso } from "@/generated/prisma/enums";
import { Badge, Card, EmptyState, Paginacao } from "@/components/ui";
import { ExcluirAvisoBotao } from "./excluir-aviso-botao";
import { PublicarAvisoForm } from "./publicar-aviso-form";

const POR_PAGINA = 25;
const DESTINOS_COM_AVISO: DestinoAviso[] = ["TODOS_REVENDEDORES", "UM_REVENDEDOR"];

export default async function ComunicadosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await exigirAdmin();
  const { pagina } = await searchParams;
  const paginaAtual = Math.max(1, Math.trunc(Number(pagina)) || 1);
  const whereAvisos = { destino: { in: DESTINOS_COM_AVISO } };

  const [totalAvisos, avisos, revendedores, cupons] = await Promise.all([
    prisma.aviso.count({ where: whereAvisos }),
    prisma.aviso.findMany({
      where: whereAvisos,
      include: { revendedor: { select: { nome: true, email: true, avisosLidosAte: true } } },
      orderBy: { criadoEm: "desc" },
      skip: (paginaAtual - 1) * POR_PAGINA,
      take: POR_PAGINA,
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
  const totalPaginas = Math.max(1, Math.ceil(totalAvisos / POR_PAGINA));

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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text">{aviso.titulo}</p>
                  {aviso.tipo === "ATUALIZACAO" ? <Badge tone="accent">🚀 Atualização</Badge> : null}
                  {aviso.revendedor ? (
                    <>
                      <Badge tone="accent">Para {aviso.revendedor.nome}</Badge>
                      {aviso.revendedor.avisosLidosAte && aviso.revendedor.avisosLidosAte >= aviso.criadoEm ? (
                        <Badge tone="success">✓ Visto</Badge>
                      ) : (
                        <Badge tone="neutral">Ainda não visto</Badge>
                      )}
                    </>
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
      <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} href={(p) => `/admin/comunicados?pagina=${p}`} />
    </div>
  );
}
