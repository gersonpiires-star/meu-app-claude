"use client";

import { ReactNode } from "react";
import { linkWhatsApp } from "@/lib/mensagens";
import { registrarCobranca } from "../clientes/[id]/cobranca-actions";

export function RegistrarCobrancaLink({
  clienteId,
  whatsapp,
  mensagem,
  modelo,
  className,
  children,
  onEnviado,
}: {
  clienteId: string;
  whatsapp: string;
  mensagem: string;
  modelo: string;
  className?: string;
  children: ReactNode;
  onEnviado?: () => void;
}) {
  return (
    <a
      href={linkWhatsApp(whatsapp, mensagem)}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        registrarCobranca(clienteId, modelo);
        onEnviado?.();
      }}
    >
      {children}
    </a>
  );
}
