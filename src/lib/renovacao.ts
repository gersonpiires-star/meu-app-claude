import { z } from "zod";
import type { PlanoCliente, StatusCliente } from "@/generated/prisma/enums";

// Retrato do cliente logo antes de uma renovação ser aplicada — guardado
// junto da Renovacao só pra permitir desfazer um lançamento errado (ex:
// renovou o cliente errado sem querer) restaurando esse estado exato, em
// vez de tentar recalcular a data de vencimento na mão.
export const snapshotClienteSchema = z.object({
  plano: z.enum(["MENSAL", "DOIS_MESES", "TRIMESTRAL", "SEMESTRAL"]),
  valorPlano: z.number(),
  vencimento: z.string(),
  status: z.enum(["TESTE", "ATIVO", "VENCIDO", "CANCELADO"]),
  testeGratis: z.boolean(),
});

export type SnapshotCliente = z.infer<typeof snapshotClienteSchema>;

export function snapshotDoCliente(cliente: {
  plano: PlanoCliente;
  valorPlano: number;
  vencimento: Date;
  status: StatusCliente;
  testeGratis: boolean;
}): SnapshotCliente {
  return {
    plano: cliente.plano,
    valorPlano: cliente.valorPlano,
    vencimento: cliente.vencimento.toISOString(),
    status: cliente.status,
    testeGratis: cliente.testeGratis,
  };
}
