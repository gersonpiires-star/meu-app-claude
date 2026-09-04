"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";

// Sem inscrição de verdade — o suporte do navegador não muda depois que a
// página carregou, então o "unsubscribe" não faz nada. useSyncExternalStore
// é o jeito certo de checar uma API só-do-cliente sem cascading render
// (setState num useEffect) e sem desencontro de hidratação (o snapshot do
// servidor é sempre "não suportado", igual ao HTML que o servidor mandou).
function inscrever() {
  return () => {};
}

function suporteNoCliente() {
  return typeof navigator !== "undefined" && "share" in navigator && "canShare" in navigator;
}

function suporteNoServidor() {
  return false;
}

// O link wa.me não tem como anexar arquivo — é limitação do próprio
// WhatsApp, não dá pra contornar por código (por isso o botão "Enviar no
// WhatsApp" só manda o texto). O compartilhamento nativo do celular (Web
// Share) já resolve isso de verdade: entrega o PDF e o texto juntos pro
// app que a pessoa escolher, incluindo o WhatsApp — só que quem escolhe
// o contato ali é o usuário, não dá pra abrir a conversa certa sozinho
// como o link wa.me faz. Some sozinho em navegador sem suporte (desktop).
export function CompartilharRecibo({
  reciboUrl,
  nomeArquivo,
  mensagem,
  className,
}: {
  reciboUrl: string;
  nomeArquivo: string;
  mensagem?: string;
  className?: string;
}) {
  const suportado = useSyncExternalStore(inscrever, suporteNoCliente, suporteNoServidor);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!suportado) return null;

  async function compartilhar() {
    setErro(null);
    setCarregando(true);
    try {
      const resposta = await fetch(reciboUrl);
      if (!resposta.ok) throw new Error("Não consegui baixar o recibo pra compartilhar.");
      const blob = await resposta.blob();
      const arquivo = new File([blob], nomeArquivo, { type: "application/pdf" });

      if (!navigator.canShare({ files: [arquivo] })) {
        throw new Error("Esse navegador não deixa compartilhar arquivo direto — baixe e anexe manualmente.");
      }

      await navigator.share({ files: [arquivo], text: mensagem });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // usuário fechou o menu de compartilhar
      setErro(e instanceof Error ? e.message : "Não consegui compartilhar o recibo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="whatsapp" className={className} onClick={compartilhar} disabled={carregando}>
        {carregando ? "Preparando…" : "Compartilhar recibo (com anexo)"}
      </Button>
      {erro ? <p className="text-[11px] font-semibold text-danger">{erro}</p> : null}
    </div>
  );
}
