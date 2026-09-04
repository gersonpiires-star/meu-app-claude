import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { MaquininhaCalc } from "./maquininha-calc";

export default async function PrecificacaoPage() {
  const revendedor = await exigirRevendedor();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-text">Precificação</h1>
        <p className="text-xs text-text-dim">
          Preço e crédito dos apps agora ficam junto da plataforma —{" "}
          <Link href="/plataformas" className="font-semibold text-accent hover:underline">
            configure em Plataformas
          </Link>
          .
        </p>
      </div>
      <MaquininhaCalc margemInicial={revendedor.margemPadrao} />
    </div>
  );
}
