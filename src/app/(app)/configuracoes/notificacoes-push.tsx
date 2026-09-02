"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { removerInscricaoPush, salvarInscricaoPush } from "./push-actions";

function urlBase64ParaUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Segura = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64Segura);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

// Estado sempre começa em "desativado" (mesma renderização no servidor e no
// cliente, sem depender de APIs do navegador) — a detecção de suporte só
// acontece depois de montar, num efeito, evitando erro de hidratação.
type Suporte = "desativado" | "ativado";

function temSuporte() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function NotificacoesPush() {
  const [estado, setEstado] = useState<Suporte>("desativado");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  useEffect(() => {
    if (!temSuporte()) return;
    navigator.serviceWorker
      .getRegistration()
      .then((registro) => registro?.pushManager.getSubscription())
      .then((inscricao) => {
        if (inscricao) setEstado("ativado");
      })
      .catch(() => {});
  }, []);

  function ativar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        if (!temSuporte()) throw new Error("Seu navegador não suporta notificações push.");

        const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!chavePublica) throw new Error("Notificações push não configuradas neste ambiente.");

        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") throw new Error("Você precisa permitir notificações no navegador.");

        const registro = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const inscricao = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ParaUint8Array(chavePublica),
        });

        await salvarInscricaoPush(inscricao.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
        setEstado("ativado");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível ativar as notificações.");
      }
    });
  }

  function desativar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        const registro = await navigator.serviceWorker.getRegistration();
        const inscricao = await registro?.pushManager.getSubscription();
        if (inscricao) {
          await removerInscricaoPush(inscricao.endpoint);
          await inscricao.unsubscribe();
        }
        setEstado("desativado");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível desativar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant={estado === "ativado" ? "ghost" : "primary"} disabled={pendente} onClick={estado === "ativado" ? desativar : ativar}>
        {pendente ? "Aguarde…" : estado === "ativado" ? "Desativar lembrete diário" : "Ativar lembrete diário"}
      </Button>
      {erro ? <p className="text-xs text-danger">{erro}</p> : null}
    </div>
  );
}
