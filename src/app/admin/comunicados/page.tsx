import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso } from "@/lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { publicarAviso } from "../actions";
import { ExcluirAvisoBotao } from "./excluir-aviso-botao";

export default async function ComunicadosPage() {
  await exigirAdmin();
  const [avisos, revendedores] = await Promise.all([
    prisma.aviso.findMany({
      where: { destino: { in: ["TODOS_REVENDEDORES", "UM_REVENDEDOR"] } },
      include: { revendedor: { select: { nome: true, email: true } } },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.revendedor.findMany({
      where: { papel: "REVENDEDOR" },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Comunicados</h1>

      <Card>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Publicar comunicado
        </p>
        <form action={publicarAviso} className="flex flex-col gap-3">
          <Field label="Destinatário">
            <Select name="destinatarioId" defaultValue="">
              <option value="">Todos os revendedores</option>
              {revendedores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome} — {r.email}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Título">
            <Input name="titulo" required />
          </Field>
          <Field label="Mensagem">
            <Textarea name="mensagem" required />
          </Field>
          <Button type="submit" className="w-full">
            Publicar
          </Button>
        </form>
      </Card>

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
