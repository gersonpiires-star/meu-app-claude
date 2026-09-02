import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Card, StatTile } from "@/components/ui";

export default async function AdminPainelPage() {
  await exigirAdmin();

  const [total, trial, ativos, pausados, interessadosAbertos] = await Promise.all([
    prisma.revendedor.count({ where: { papel: "REVENDEDOR" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "TRIAL" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "ATIVO" } }),
    prisma.revendedor.count({ where: { papel: "REVENDEDOR", statusAssinatura: "PAUSADO" } }),
    prisma.interessado.count({ where: { convertido: false } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-text">Painel do administrador</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Assinantes" value={String(total)} tone="accent" />
        <StatTile label="Em trial" value={String(trial)} />
        <StatTile label="Ativos" value={String(ativos)} tone="accent" />
        <StatTile label="Pausados" value={String(pausados)} tone="warning" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/admin/assinantes">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Assinantes</h2>
            <p className="mt-1 text-sm text-text-dim">Gerencie acesso, veja uso e os serviços que cada um revende.</p>
          </Card>
        </Link>
        <Link href="/admin/interessados">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Interessados</h2>
            <p className="mt-1 text-sm text-text-dim">{interessadosAbertos} em aberto para retornar contato.</p>
          </Card>
        </Link>
        <Link href="/admin/comunicados">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Comunicados</h2>
            <p className="mt-1 text-sm text-text-dim">Aviso em massa por app, publicado para todos os assinantes.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
