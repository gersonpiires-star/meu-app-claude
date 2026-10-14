import { ZodType } from "zod";

// Troca schema.parse(...) por isso em toda Server Action que recebe dado de
// formulário. Sem isso, um campo que passa pela validação do HTML mas falha
// numa regra do Zod (ex: WhatsApp com menos de 10 dígitos) lança um erro não
// tratado que sobe até o error.tsx genérico da rota — e os dados que a
// pessoa digitou no formulário inteiro somem, mesmo a mensagem específica já
// existindo no schema ("WhatsApp inválido — informe DDD + número").
export function validarOuErro<T>(
  schema: ZodType<T>,
  dadosBrutos: unknown
): { ok: true; dados: T } | { ok: false; erro: string } {
  const resultado = schema.safeParse(dadosBrutos);
  if (!resultado.success) {
    return { ok: false, erro: resultado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return { ok: true, dados: resultado.data };
}
