import { exigirAdmin } from "@/lib/sessao";
import { NavShellAdmin } from "@/components/nav-shell-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();
  return <NavShellAdmin nome={admin.nome}>{children}</NavShellAdmin>;
}
