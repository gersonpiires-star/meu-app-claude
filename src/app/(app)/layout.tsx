import { exigirRevendedor, acessoLiberado, motivoBloqueio } from "@/lib/sessao";
import { NavShell } from "@/components/nav-shell";
import { AcessoPausado } from "@/components/acesso-pausado";
import { InactivityLogout } from "@/components/inactivity-logout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const revendedor = await exigirRevendedor();
  const ehAdmin = revendedor.papel === "ADMIN";

  if (!ehAdmin && !acessoLiberado(revendedor)) {
    return <AcessoPausado nome={revendedor.nome} motivo={motivoBloqueio(revendedor)} />;
  }

  return (
    <>
      <InactivityLogout minutos={5} />
      <NavShell nome={revendedor.nome} ehAdmin={ehAdmin}>
        {children}
      </NavShell>
    </>
  );
}
