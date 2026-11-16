import Link from "next/link";
import { exigirDono } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/format";
import { Badge, Card, EmptyState, Paginacao } from "@/components/ui";

const POR_PAGINA = 25;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; autor?: string }>;
}) {
  const revendedor = await exigirDono();
  const { pagina: paginaParam, autor } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const where = { revendedorId: revendedor.id, ...(autor ? { autorNome: autor } : {}) };

  const [logs, total, autoresRaw] = await Promise.all([
    prisma.logAtividade.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.logAtividade.count({ where }),
    prisma.logAtividade.findMany({
      where: { revendedorId: revendedor.id },
      distinct: ["autorNome"],
      select: { autorNome: true },
      orderBy: { autorNome: "asc" },
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const autores = autoresRaw.map((a) => a.autorNome);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/configuracoes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Configurações
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Histórico de ações</h1>
        <p className="text-xs text-text-dim">Ações sensíveis feitas por você e por seus funcionários — {total} no total.</p>
      </div>

      {autores.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Link
            href="/configuracoes/historico"
            className={`rounded-lg px-2.5 py-1 font-semibold ${!autor ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"}`}
          >
            Todos
          </Link>
          {autores.map((nome) => (
            <Link
              key={nome}
              href={`/configuracoes/historico?autor=${encodeURIComponent(nome)}`}
              className={`rounded-lg px-2.5 py-1 font-semibold ${autor === nome ? "bg-accent-soft text-accent" : "text-text-dim hover:text-text"}`}
            >
              {nome}
            </Link>
          ))}
        </div>
      ) : null}

      {logs.length === 0 ? (
        <EmptyState>Nenhuma ação registrada ainda.</EmptyState>
      ) : (
        <>
          <Card className="p-0">
            <div className="flex flex-col divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-text-dim">{dataHora(log.criadoEm)}</span>
                    <Badge tone={log.autorTipo === "FUNCIONARIO" ? "warning" : "neutral"}>{log.autorNome}</Badge>
                  </div>
                  <p className="text-sm text-text">{log.descricao}</p>
                </div>
              ))}
            </div>
          </Card>
          <Paginacao
            pagina={pagina}
            totalPaginas={totalPaginas}
            href={(p) => `/configuracoes/historico?pagina=${p}${autor ? `&autor=${encodeURIComponent(autor)}` : ""}`}
          />
        </>
      )}
    </div>
  );
}
