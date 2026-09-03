import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataCurta } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { NovoInteressadoForm } from "./novo-interessado-form";
import { InteressadoAcoes } from "./interessado-acoes";

export default async function InteressadosPage() {
  await exigirAdmin();
  const interessados = await prisma.interessado.findMany({ orderBy: { criadoEm: "desc" } });

  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const precisaRetornar = (i: (typeof interessados)[number]) =>
    !i.convertido && i.retornarEm != null &&
    new Date(i.retornarEm.getFullYear(), i.retornarEm.getMonth(), i.retornarEm.getDate()) <= hoje;

  const leadsHoje = interessados.filter(precisaRetornar);
  const ordenados = [...interessados].sort((a, b) => Number(precisaRetornar(b)) - Number(precisaRetornar(a)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text">Interessados</h1>
        <NovoInteressadoForm />
      </div>

      {leadsHoje.length > 0 ? (
        <Card className="border-danger/40 bg-danger/5">
          <p className="text-sm font-semibold text-danger">
            {leadsHoje.length} lead(s) para retornar hoje ou atrasado(s)
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
    </div>
  );
}
