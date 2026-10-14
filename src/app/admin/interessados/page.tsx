import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataCurta, diaCivilBr } from "@/lib/format";
import { Badge, Card, EmptyState, Paginacao } from "@/components/ui";
import { NovoInteressadoForm } from "./novo-interessado-form";
import { InteressadoAcoes } from "./interessado-acoes";

const POR_PAGINA = 25;

export default async function InteressadosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await exigirAdmin();
  const { pagina } = await searchParams;
  const paginaAtual = Math.max(1, Math.trunc(Number(pagina)) || 1);

  const hojeCivil = diaCivilBr(new Date());
  const hoje = new Date(hojeCivil.ano, hojeCivil.mes, hojeCivil.dia);
  const precisaRetornar = (i: { convertido: boolean; retornarEm: Date | null }) => {
    if (i.convertido || i.retornarEm == null) return false;
    const rc = diaCivilBr(i.retornarEm);
    return new Date(rc.ano, rc.mes, rc.dia) <= hoje;
  };

  const [totalInteressados, interessados, candidatosRetorno] = await Promise.all([
    prisma.interessado.count(),
    prisma.interessado.findMany({
      orderBy: { criadoEm: "desc" },
      skip: (paginaAtual - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    // Contagem exata do aviso "retornar hoje" não pode ficar presa à página
    // atual — só os 2 campos (sem o resto da linha) pra não reintroduzir
    // uma listagem pesada sem limite só pra montar esse número.
    prisma.interessado.findMany({
      where: { convertido: false, retornarEm: { not: null } },
      select: { convertido: true, retornarEm: true },
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalInteressados / POR_PAGINA));

  const leadsHojeCount = candidatosRetorno.filter(precisaRetornar).length;
  // A ordenação "mais urgente primeiro" só vale dentro da página carregada —
  // paginado, não dá mais pra trazer a tabela inteira só pra reordenar.
  const ordenados = [...interessados].sort((a, b) => Number(precisaRetornar(b)) - Number(precisaRetornar(a)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Interessados</h1>
        <NovoInteressadoForm />
      </div>

      {leadsHojeCount > 0 ? (
        <Card className="border-danger/40 bg-danger/5">
          <p className="text-sm font-semibold text-danger">
            {leadsHojeCount} lead(s) para retornar hoje ou atrasado(s)
          </p>
        </Card>
      ) : null}

      {interessados.length === 0 ? (
        <EmptyState>Nenhum interessado registrado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenados.map((i) => {
            const atrasado = precisaRetornar(i);
            return (
              <Card key={i.id} className={atrasado ? "border-danger/40" : undefined}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text">{i.nome}</p>
                    <p className="text-xs text-text-dim">{i.whatsapp}</p>
                    {i.interesse ? <p className="mt-1 text-sm text-text-muted">{i.interesse}</p> : null}
                    {i.observacao ? <p className="mt-1 text-xs text-text-dim">{i.observacao}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {i.convertido ? (
                      <Badge tone="accent">Virou cliente</Badge>
                    ) : atrasado ? (
                      <Badge tone="danger">Retornar hoje · {dataCurta(i.retornarEm!)}</Badge>
                    ) : i.retornarEm ? (
                      <Badge tone="warning">Retornar {dataCurta(i.retornarEm)}</Badge>
                    ) : null}
                    {!i.convertido ? <InteressadoAcoes id={i.id} /> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} href={(p) => `/admin/interessados?pagina=${p}`} />
    </div>
  );
}
