import { redirect } from "next/navigation";
import { sessaoValida } from "@/lib/sessao";
import { LandingPage } from "@/components/landing-page";

export default async function Home() {
  const session = await sessaoValida();
  if (!session) return <LandingPage />;
  redirect(session.user.papel === "ADMIN" ? "/admin" : "/painel");
}
