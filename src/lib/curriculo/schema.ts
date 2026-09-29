import { z } from "zod";

const texto = (max: number) => z.string().trim().max(max);

export const TEMPLATES = ["classico", "moderno"] as const;
export type TemplateCurriculo = (typeof TEMPLATES)[number];

export const curriculoSchema = z.object({
  template: z.enum(TEMPLATES),
  nome: texto(80).min(2, "Informe seu nome"),
  cargo: texto(80),
  email: texto(120),
  telefone: texto(30),
  cidade: texto(80),
  resumo: texto(700),
  experiencias: z
    .array(
      z.object({
        cargo: texto(80),
        empresa: texto(80),
        periodo: texto(40),
        descricao: texto(600),
      }),
    )
    .max(6),
  formacoes: z
    .array(
      z.object({
        curso: texto(100),
        instituicao: texto(100),
        periodo: texto(40),
      }),
    )
    .max(4),
  habilidades: z.array(texto(40)).max(15),
});

export type Curriculo = z.infer<typeof curriculoSchema>;

export const CURRICULO_VAZIO: Curriculo = {
  template: "classico",
  nome: "",
  cargo: "",
  email: "",
  telefone: "",
  cidade: "",
  resumo: "",
  experiencias: [{ cargo: "", empresa: "", periodo: "", descricao: "" }],
  formacoes: [{ curso: "", instituicao: "", periodo: "" }],
  habilidades: [],
};

export function precoCurriculo(): number {
  const valor = Number(process.env.CURRICULO_PRECO ?? "9.9");
  return Number.isFinite(valor) && valor >= 1 ? valor : 9.9;
}
