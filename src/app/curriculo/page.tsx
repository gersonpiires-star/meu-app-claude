import type { Metadata } from "next";
import { precoCurriculo } from "@/lib/curriculo/schema";
import { EditorCurriculo } from "./editor";

export const metadata: Metadata = {
  title: "Fazer currículo online grátis em PDF | Modelo pronto",
  description:
    "Monte seu currículo em minutos, veja o resultado na hora e baixe em PDF pronto para enviar. Modelos para primeiro emprego e para quem já tem experiência.",
  robots: { index: true, follow: true },
};

export default function CurriculoPage() {
  const preco = precoCurriculo();
  return (
    <main className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold sm:text-3xl">Faça seu currículo online em PDF</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Preencha os campos e veja o currículo se montando ao lado. Só paga quando estiver satisfeito e for baixar o PDF.
        </p>
      </header>

      <EditorCurriculo preco={preco} />

      <section className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-600">
        <h2 className="text-lg font-semibold text-slate-900">Perguntas frequentes</h2>
        <h3 className="mt-4 font-medium text-slate-900">Como funciona o pagamento?</h3>
        <p>Você paga uma única vez por Pix ou cartão no Mercado Pago. Assim que o pagamento é confirmado, o PDF é liberado.</p>
        <h3 className="mt-4 font-medium text-slate-900">Posso montar meu currículo para primeiro emprego?</h3>
        <p>
          Sim. Deixe a experiência em branco e destaque formação, cursos e habilidades. Currículo simples e objetivo funciona bem.
        </p>
        <h3 className="mt-4 font-medium text-slate-900">Meus dados ficam salvos?</h3>
        <p>
          O rascunho fica só no seu navegador. Ao ir para o pagamento, os dados do currículo são guardados apenas para gerar o seu PDF.
        </p>
      </section>
    </main>
  );
}
