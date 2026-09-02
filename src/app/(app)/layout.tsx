import { exigirRevendedor, acessoLiberado } from "@/lib/sessao";
import { NavShell } from "@/components/nav-shell";
import { AcessoPausado } from "@/components/acesso-pausado";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const revendedor = await exigirRevendedor();
  const ehAdmin = revendedor.papel === "ADMIN";

  if (!ehAdmin && !acessoLiberado(revendedor)) {
    return <AcessoPausado nome={revendedor.nome} />;
  }

  return (
    <NavShell nome={revendedor.nome} ehAdmin={ehAdmin}>
      {children}
    </NavShell>
  );
}
