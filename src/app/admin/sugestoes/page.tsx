import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataCurta } from "@/lib/format";
import { Badge, Card, EmptyState, Paginacao } from "@/components/ui";
import { MarcarSugestaoLidaBotao } from "../marcar-sugestao-lida-botao";
import { SugestaoDestaqueBotao } from "./sugestao-destaque-botao";

const POR_PAGINA = 25;

export default async function SugestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await exigirAdmin();
  const { pagina } = await searchParams;
  const paginaAtual = Math.max(1, Math.trunc(Number(pagina)) || 1);

  const [naoLidas, totalSugestoes, sugestoes] = await Promise.all([
    prisma.sugestao.count({ where: { lida: false } }),
    prisma.sugestao.count(),
    prisma.sugestao.findMany({
      include: { revendedor: { select: { nome: true, email: true } } },
      orderBy: [{ destaque: "desc" }, { criadoEm: "desc" }],
      skip: (paginaAtual - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(totalSugestoes / POR_PAGINA));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-text">Sugestões dos usuários</h1>
        <p className="text-xs text-text-dim">
          Tudo que os revendedores mandaram — dicas, pedidos de melhoria e reclamações.
          {naoLidas > 0 ? ` ${naoLidas} ainda não lida${naoLidas === 1 ? "" : "s"}.` : ""}
        </p>
      </div>

      {sugestoes.length === 0 ? (
        <EmptyState>Nenhuma sugestão recebida ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {sugestoes.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text">{s.revendedor.nome}</p>
                    {s.destaque ? <Badge tone="warning">★ Pra implementar</Badge> : null}
                    {s.lida ? null : <Badge tone="accent">Não lida</Badge>}
                  </div>
                  <p className="text-xs text-text-dim">{s.revendedor.email}</p>
                  <p className="mt-2 text-sm text-text">{s.mensagem}</p>
                  <p className="mt-1 text-xs text-text-dim">{dataCurta(s.criadoEm)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <SugestaoDestaqueBotao id={s.id} destaque={s.destaque} />
                  {s.lida ? null : <MarcarSugestaoLidaBotao id={s.id} />}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} href={(p) => `/admin/sugestoes?pagina=${p}`} />
    </div>
  );
}
