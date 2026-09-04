import { exigirAdmin } from "@/lib/sessao";
import { NavShellAdmin } from "@/components/nav-shell-admin";
import { InactivityLogout } from "@/components/inactivity-logout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();
  return (
    <>
      <InactivityLogout minutos={5} />
      <NavShellAdmin nome={admin.nome}>{children}</NavShellAdmin>
    </>
  );
}
