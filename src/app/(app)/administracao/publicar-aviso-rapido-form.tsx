"use client";

import { Button, Textarea } from "@/components/ui";
import { publicarAviso } from "../../admin/actions";

export function PublicarAvisoRapidoForm() {
  return (
    <form action={publicarAviso} className="flex flex-col gap-3">
      <input type="hidden" name="titulo" value="Aviso do sistema" />
      <input type="hidden" name="tipo" value="GERAL" />
      <Textarea name="mensagem" required placeholder="Ex: manutenção programada no domingo…" />
      <Button type="submit" className="w-full">
        Publicar aviso
      </Button>
    </form>
  );
}
