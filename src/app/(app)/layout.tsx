import { exigirRevendedor, acessoLiberado } from "@/lib/sessao";
import { NavShell } from "@/components/nav-shell";
import { AcessoPausado } from "@/components/acesso-pausado";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const revendedor = await exigirRevendedor();

  if (!acessoLiberado(revendedor)) {
    return <AcessoPausado nome={revendedor.nome} />;
  }

  return <NavShell nome={revendedor.nome}>{children}</NavShell>;
}
