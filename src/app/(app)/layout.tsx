import { exigirRevendedor, acessoLiberado, motivoBloqueio } from "@/lib/sessao";
import { avisosParaRevendedor } from "@/lib/avisos";
import { NavShell } from "@/components/nav-shell";
import { AcessoPausado } from "@/components/acesso-pausado";
import { InactivityLogout } from "@/components/inactivity-logout";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const revendedor = await exigirRevendedor();
  const ehAdmin = revendedor.papel === "ADMIN";

  if (!ehAdmin && !acessoLiberado(revendedor)) {
    return <AcessoPausado nome={revendedor.nome} motivo={motivoBloqueio(revendedor)} />;
  }

  const { avisos, naoLidos } = await avisosParaRevendedor(revendedor);

  return (
    <>
      <InactivityLogout minutos={5} />
      <NavShell nome={revendedor.nome} ehAdmin={ehAdmin} avisos={avisos} avisosNaoLidos={naoLidos}>
        {children}
      </NavShell>
    </>
  );
}
