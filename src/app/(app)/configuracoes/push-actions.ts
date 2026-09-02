"use server";

import { prisma } from "@/lib/prisma";
import { exigirRevendedor } from "@/lib/sessao";

type InscricaoPush = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function salvarInscricaoPush(subscription: InscricaoPush) {
  const revendedor = await exigirRevendedor();
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { revendedorId: revendedor.id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      revendedorId: revendedor.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });
}

export async function removerInscricaoPush(endpoint: string) {
  const revendedor = await exigirRevendedor();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, revendedorId: revendedor.id } });
}
