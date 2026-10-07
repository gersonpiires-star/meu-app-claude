import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

// Best-effort, igual ao registrarLog: evento de produto nunca pode
// derrubar a ação de negócio que ele está medindo.
export async function registrarEvento(revendedorId: string | null, evento: string, metadata?: Record<string, unknown>) {
  try {
    await prisma.eventoAnalytics.create({
      data: { revendedorId, evento, metadata: metadata as Prisma.InputJsonValue },
    });
  } catch (erro) {
    console.error("Falha ao registrar evento de analytics", erro);
  }
}
