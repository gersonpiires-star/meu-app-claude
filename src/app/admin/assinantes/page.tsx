import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { dataCurta, diaCivilBr } from "@/lib/format";
import { Badge, Card, EmptyState, Input } from "@/components/ui";

function statusBadge(revendedor: { statusAssinatura: string; trialFim: Date; assinaturaVence: Date | null }) {
  const agora = new Date();
  if (revendedor.statusAssinatura === "ATIVO") {
    return <Badge tone="accent">Ativo</Badge>;
  }
  if (revendedor.statusAssinatura === "CANCELADO") {
    return <Badge tone="neutral">Cancelado</Badge>;
  }
  if (revendedor.statusAssinatura === "TRIAL") {
    const dias = Math.max(0, Math.ceil((revendedor.trialFim.getTime() - agora.getTime()) / 86400000));
    return <Badge tone={dias > 0 ? "neutral" : "danger"}>{dias > 0 ? `+${dias}d trial` : "Trial expirado"}</Badge>;
  }
  return <Badge tone="danger">Pausado</Badge>;
}

function diaDoTrial(criadoEm: Date): number {
  const c = diaCivilBr(criadoEm);
  const h = diaCivilBr(new Date());
  return Math.round((new Date(h.ano, h.mes, h.dia).getTime() - new Date(c.ano, c.mes, c.dia).getTime()) / 86400000) + 1;
}

function linkNutricaoWhatsapp(whatsapp: string, nome: string, temClientes: boolean) {
  const primeiroNome = nome.split(" ")[0];
  const texto = temClientes
    ? `Oi ${primeiroNome}! Vi que você já começou a usar o GestorPro. Ficou alguma dúvida ou posso ajudar em algo?`
    : `Oi ${primeiroNome}! Notei que você criou sua conta no GestorPro mas ainda não cadastrou nenhum cliente. Posso te ajudar a começar?`;
  return `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

export default async function AssinantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await exigirAdmin();
  const { q } = await searchParams;
  const busca = q?.trim();

  const revendedores = await prisma.revendedor.findMany({
    where: {
      papel: "REVENDEDOR",
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              { email: { contains: busca, mode: "insensitive" } },
              { cpf: { contains: busca } },
            ],
          }
        : {}),
    },
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { clientes: true } } },
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-text">Assinantes</h1>

      <form action="/admin/assinantes" method="get">
        <Input name="q" defaultValue={busca ?? ""} placeholder="Buscar por nome, e-mail ou CPF" />
      </form>

      {revendedores.length === 0 ? (
        <EmptyState>
          {busca ? "Nenhum assinante encontrado com essa busca." : "Nenhuma conta ainda. Elas aparecem aqui assim que alguém se cadastrar."}
        </EmptyState>
      ) : (
        <Card className="p-0">
          <div className="flex flex-col divide-y divide-border">
            {revendedores.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                <Link href={`/admin/assinantes/${a.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{a.nome}</p>
                  <p className="truncate text-xs text-text-dim">
                    CPF {a.cpf || "—"} · desde {dataCurta(a.criadoEm)} ·{" "}
                    {a._count.clientes === 0 ? "criou a conta mas nunca chegou a usar o app" : `${a._count.clientes} clientes`}
                    {a.statusAssinatura === "TRIAL" ? ` · dia ${diaDoTrial(a.criadoEm)} do trial` : ""}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  {a.statusAssinatura === "TRIAL" && a.whatsapp ? (
                    <a href={linkNutricaoWhatsapp(a.whatsapp, a.nome, a._count.clientes > 0)} target="_blank" rel="noreferrer">
                      <Badge tone="accent">Chamar</Badge>
                    </a>
                  ) : null}
                  {statusBadge(a)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
