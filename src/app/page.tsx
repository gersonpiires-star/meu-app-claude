import { redirect } from "next/navigation";
import { sessaoValida } from "@/lib/sessao";

export default async function Home() {
  const session = await sessaoValida();
  if (!session) redirect("/entrar");
  redirect(session.user.papel === "ADMIN" ? "/admin" : "/painel");
}
