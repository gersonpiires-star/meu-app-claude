import Link from "next/link";
import { exigirRevendedor } from "@/lib/sessao";
import { prisma } from "@/lib/prisma";
import { MODELOS_PADRAO } from "@/lib/mensagens";
import { Card } from "@/components/ui";
import { ModeloItem } from "./modelo-item";

export default async function ModelosMensagemPage() {
  const revendedor = await exigirRevendedor();
  const overrides = await prisma.modeloMensagem.findMany({ where: { revendedorId: revendedor.id } });
  const mapaOverrides = new Map(overrides.map((o) => [o.chave, o.texto]));

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link href="/configuracoes" className="text-xs font-semibold text-text-dim hover:text-text">
        ‹ Configurações
      </Link>
      <div>
        <h1 className="text-lg font-bold text-text">Modelos de mensagem</h1>
        <p className="text-xs text-text-dim">Personalize como cada mensagem fica na conversa</p>
      </div>
      <Card className="flex flex-col gap-4">
        {Object.entries(MODELOS_PADRAO).map(([chave, padrao]) => (
          <ModeloItem
            key={chave}
            chave={chave}
            textoAtual={mapaOverrides.get(chave) ?? padrao}
            personalizado={mapaOverrides.has(chave)}
          />
        ))}
      </Card>
    </div>
  );
}
