"use client";

import { useState } from "react";
import { cx } from "@/components/ui";
import { MaquininhaCalc } from "./maquininha-calc";
import { AppsTab } from "./apps-tab";

export function PrecificacaoTabs({
  servicos,
  plataformas,
}: {
  servicos: { id: string; nome: string; plataformaId: string | null; custoCredito: number | null; cobrancaTelaExtra: number | null }[];
  plataformas: { id: string; nome: string }[];
}) {
  const [aba, setAba] = useState<"maq" | "apps">("maq");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-xl border border-border-strong p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setAba("maq")}
          className={cx("flex-1 rounded-lg py-2 text-center", aba === "maq" ? "bg-accent-soft text-accent" : "text-text-dim")}
        >
          Maquininha
        </button>
        <button
          type="button"
          onClick={() => setAba("apps")}
          className={cx("flex-1 rounded-lg py-2 text-center", aba === "apps" ? "bg-accent-soft text-accent" : "text-text-dim")}
        >
          Apps
        </button>
      </div>

      {aba === "maq" ? <MaquininhaCalc /> : <AppsTab servicos={servicos} plataformas={plataformas} />}
    </div>
  );
}
