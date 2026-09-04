"use client";

import { useState } from "react";
import { Button, cx, type ButtonVariant } from "@/components/ui";

// Um <a href target="_blank"> pra um PDF navega a página de verdade — em
// alguns PWAs instalados no celular isso escapa pra fora do app (sem barra
// de navegador, sem botão de voltar) e prende o usuário lá, tendo que
// fechar e reabrir o app pra sair. Baixar via fetch + Blob nunca navega
// nada — o clique fica inteiramente dentro da página atual, então não tem
// como "prender" em lugar nenhum.
function useBaixarRecibo(reciboUrl: string, nomeArquivo: string) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch(reciboUrl);
      if (!resposta.ok) throw new Error("Não consegui baixar o recibo.");
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui baixar o recibo.");
    } finally {
      setCarregando(false);
    }
  }

  return { baixar, carregando, erro };
}

export function BaixarRecibo({
  reciboUrl,
  nomeArquivo,
  variant = "ghost",
  className,
  children = "Baixar recibo em PDF",
}: {
  reciboUrl: string;
  nomeArquivo: string;
  variant?: ButtonVariant;
  className?: string;
  children?: React.ReactNode;
}) {
  const { baixar, carregando, erro } = useBaixarRecibo(reciboUrl, nomeArquivo);

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant={variant} className={className} onClick={baixar} disabled={carregando}>
        {carregando ? "Baixando…" : children}
      </Button>
      {erro ? <p className="text-[11px] font-semibold text-danger">{erro}</p> : null}
    </div>
  );
}

// Versão discreta, estilizada como link de texto — pra caber numa linha de
// tabela/lista compacta (ex: "Recibo" ao lado de outras ações curtas).
export function BaixarReciboLink({
  reciboUrl,
  nomeArquivo,
  className,
  children = "Recibo",
}: {
  reciboUrl: string;
  nomeArquivo: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { baixar, carregando } = useBaixarRecibo(reciboUrl, nomeArquivo);

  return (
    <button
      type="button"
      onClick={baixar}
      disabled={carregando}
      className={cx("text-xs font-semibold text-accent hover:underline disabled:opacity-50", className)}
    >
      {carregando ? "Baixando…" : children}
    </button>
  );
}
