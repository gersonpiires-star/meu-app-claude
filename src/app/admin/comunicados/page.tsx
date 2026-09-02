import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataPorExtenso } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { publicarAviso } from "../actions";

export default async function ComunicadosPage() {
  await exigirAdmin();
  const avisos = await prisma.aviso.findMany({
    where: { destino: "TODOS_REVENDEDORES" },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Comunicados</h1>

      <Card>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-dim">
          Aviso em massa por app
        </p>
        <form action={publicarAviso} className="flex flex-col gap-3">
          <Field label="Título">
            <Input name="titulo" required />
          </Field>
          <Field label="Mensagem">
            <Textarea name="mensagem" required />
          </Field>
          <Button type="submit" className="w-full">
            Publicar para todos
          </Button>
        </form>
      </Card>

      {avisos.length === 0 ? (
        <EmptyState>Nenhum comunicado publicado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {avisos.map((aviso) => (
            <Card key={aviso.id}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-text">{aviso.titulo}</p>
                <span className="text-xs text-text-dim">{dataPorExtenso(aviso.criadoEm)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{aviso.mensagem}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
