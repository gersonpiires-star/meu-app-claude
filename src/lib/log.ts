import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Best-effort: se o log falhar não pode derrubar a ação que ele está
// registrando, por isso engole qualquer erro.
export async function registrarLog(revendedorId: string, acao: string, descricao: string, autorTipoForcado?: "ADMIN") {
  try {
    const session = await auth();
    await prisma.logAtividade.create({
      data: {
        revendedorId,
        autorNome: session?.user?.name ?? "Sistema",
        autorTipo: autorTipoForcado ?? (session?.user?.funcionario ? "FUNCIONARIO" : "DONO"),
        acao,
        descricao,
      },
    });
  } catch (erro) {
    console.error("Falha ao registrar log de atividade", erro);
  }
}
