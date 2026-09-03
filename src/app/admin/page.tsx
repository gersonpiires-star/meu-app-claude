import Link from "next/link";
import { exigirAdmin } from "@/lib/sessao";
import { dadosAdmin } from "@/lib/dados-admin";
import { brl0 } from "@/lib/format";
import { diasParaVencer } from "@/lib/planos";
import { Badge, Button, Card, StatTile } from "@/components/ui";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function AdminPainelPage() {
  await exigirAdmin();
  const dados = await dadosAdmin();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-text">Painel do administrador</h1>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">Este mês</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Receita de assinaturas" value={brl0(dados.receitaMes)} tone="accent" />
          <StatTile
            label="Retenção"
            value={`${dados.taxaRetencao.toFixed(0)}%`}
            sub={`${dados.pausadosMes} pausado${dados.pausadosMes === 1 ? "" : "s"} este mês`}
            tone={dados.taxaRetencao >= 90 ? "accent" : dados.taxaRetencao >= 75 ? "warning" : "danger"}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-dim">O que vem por aí</p>
        <Card className="border-accent-strong bg-accent-soft/20">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
            Previsto para {MESES[dados.proximoMes.getMonth()]}
          </p>
          <p className="mt-1 text-3xl font-bold text-accent">{brl0(dados.previstoProxMes)}</p>
          <p className="mt-1 text-xs text-text-dim">Receita prevista se todos os assinantes ativos continuarem</p>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Planos mensais</p>
              <p className="mt-0.5 font-semibold text-text">{brl0(dados.previstoMensal)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">Planos anuais (mensalizado)</p>
              <p className="mt-0.5 font-semibold text-text">{brl0(dados.previstoAnual)}</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-text-dim">
            {dados.ativos} assinante{dados.ativos === 1 ? "" : "s"} ativo{dados.ativos === 1 ? "" : "s"}
            {dados.ativosSemPagamento > 0
              ? ` (${dados.ativosSemPagamento} sem pagamento registrado, não entra na conta)`
              : ""}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Assinantes" value={String(dados.total)} tone="accent" />
        <StatTile label="Em trial" value={String(dados.trial)} />
        <StatTile label="Ativos" value={String(dados.ativos)} tone="accent" />
        <StatTile label="Pausados" value={String(dados.pausados)} tone="warning" />
      </div>

      {dados.trialsVencendo.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-bold text-text">Trials vencendo em breve</h2>
          <div className="flex flex-col divide-y divide-border">
            {dados.trialsVencendo.map((r) => {
              const dias = diasParaVencer(r.trialFim);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/admin/assinantes/${r.id}`} className="truncate text-sm font-semibold text-text hover:text-accent">
                      {r.nome}
                    </Link>
                    <p className="text-xs text-text-dim">
                      {dias < 0 ? "trial expirado" : dias === 0 ? "vence hoje" : `vence em ${dias}d`}
                    </p>
                  </div>
                  {r.whatsapp ? (
                    <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                      <Badge tone={dias <= 0 ? "danger" : "warning"}>Chamar</Badge>
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

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
            <p className="mt-1 text-sm text-text-dim">{dados.interessadosAbertos} em aberto para retornar contato.</p>
          </Card>
        </Link>
        <Link href="/admin/comunicados">
          <Card className="h-full hover:border-accent-strong">
            <h2 className="font-bold text-text">Comunicados</h2>
            <p className="mt-1 text-sm text-text-dim">Aviso em massa por app, publicado para todos os assinantes.</p>
          </Card>
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text">Lembrete diário</h2>
            <p className="mt-1 text-sm text-text-dim">
              Ative pra receber um aviso todo dia sobre trials vencendo e pagamentos de assinatura recusados.
            </p>
          </div>
          <Link href="/configuracoes">
            <Button variant="ghost">Configurações</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
