import Link from "next/link";
import { exigirDono } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { FuncionarioForm } from "./funcionario-form";

export default async function FuncionariosPage() {
  const revendedor = await exigirDono();
  const funcionarios = await prisma.funcionario.findMany({
    where: { revendedorId: revendedor.id },
    orderBy: { criadoEm: "desc" },
  });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/configuracoes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Configurações
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Funcionários</h1>
        <p className="text-xs text-text-dim">
          Logins adicionais com acesso aos mesmos clientes, vendas e relatórios — não podem ver ou
          trocar suas credenciais de pagamento nem gerenciar outros funcionários.
        </p>
      </div>
      <Card>
        <FuncionarioForm funcionarios={funcionarios} />
      </Card>
    </div>
  );
}
