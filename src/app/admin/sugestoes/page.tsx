import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataCurta } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { MarcarSugestaoLidaBotao } from "../marcar-sugestao-lida-botao";
import { SugestaoDestaqueBotao } from "./sugestao-destaque-botao";

export default async function SugestoesPage() {
  await exigirAdmin();
  const sugestoes = await prisma.sugestao.findMany({
    include: { revendedor: { select: { nome: true, email: true } } },
    orderBy: [{ destaque: "desc" }, { criadoEm: "desc" }],
  });

  const naoLidas = sugestoes.filter((s) => !s.lida).length;

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
    </div>
  );
}
