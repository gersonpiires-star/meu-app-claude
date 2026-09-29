"use client";

import { useEffect, useState, useTransition } from "react";
import { CURRICULO_VAZIO, type Curriculo, type TemplateCurriculo } from "@/lib/curriculo/schema";
import { iniciarPagamentoCurriculo } from "./actions";

const CHAVE_RASCUNHO = "curriculo:rascunho";

const campo =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200";
const rotulo = "mb-1 block text-xs font-medium text-slate-600";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EditorCurriculo({ preco }: { preco: number }) {
  const [dados, setDados] = useState<Curriculo>(CURRICULO_VAZIO);
  const [habilidadesTexto, setHabilidadesTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_RASCUNHO);
      if (salvo) {
        const lido = JSON.parse(salvo) as Curriculo;
        // Só dá pra ler o rascunho depois da hidratação (localStorage não
        // existe no servidor), senão o HTML inicial divergiria do cliente.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDados(lido);
        setHabilidadesTexto(lido.habilidades.join(", "));
      }
    } catch {}
  }, []);

  function atualizar(proximo: Curriculo) {
    setDados(proximo);
    try {
      window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(proximo));
    } catch {}
  }

  function definirHabilidades(texto: string) {
    setHabilidadesTexto(texto);
    atualizar({
      ...dados,
      habilidades: texto
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)
        .slice(0, 15),
    });
  }

  function pagar() {
    setErro(null);
    iniciar(async () => {
      const resposta = await iniciarPagamentoCurriculo(dados);
      if ("erro" in resposta) setErro(resposta.erro);
      else window.location.href = resposta.url;
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-6 lg:grid-cols-2">
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend className={rotulo}>Modelo</legend>
          <div className="flex gap-2">
            {(["classico", "moderno"] as TemplateCurriculo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => atualizar({ ...dados, template: t })}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  dados.template === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white"
                }`}
              >
                {t === "classico" ? "Clássico" : "Moderno"}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={rotulo}>Nome completo *</label>
            <input className={campo} value={dados.nome} maxLength={80} onChange={(e) => atualizar({ ...dados, nome: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Cargo desejado</label>
            <input className={campo} value={dados.cargo} maxLength={80} placeholder="Ex: Auxiliar administrativo" onChange={(e) => atualizar({ ...dados, cargo: e.target.value })} />
          </div>
          <div>
            <label className={rotulo}>E-mail</label>
            <input className={campo} type="email" value={dados.email} maxLength={120} onChange={(e) => atualizar({ ...dados, email: e.target.value })} />
          </div>
          <div>
            <label className={rotulo}>Telefone / WhatsApp</label>
            <input className={campo} value={dados.telefone} maxLength={30} onChange={(e) => atualizar({ ...dados, telefone: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Cidade / UF</label>
            <input className={campo} value={dados.cidade} maxLength={80} onChange={(e) => atualizar({ ...dados, cidade: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={rotulo}>Resumo profissional</label>
            <textarea className={campo} rows={4} value={dados.resumo} maxLength={700} placeholder="Fale em poucas linhas quem você é e o que busca." onChange={(e) => atualizar({ ...dados, resumo: e.target.value })} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Experiência profissional</h2>
          {dados.experiencias.map((exp, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
              <input className={campo} placeholder="Cargo" value={exp.cargo} maxLength={80} onChange={(e) => atualizar({ ...dados, experiencias: dados.experiencias.map((x, j) => (j === i ? { ...x, cargo: e.target.value } : x)) })} />
              <input className={campo} placeholder="Empresa" value={exp.empresa} maxLength={80} onChange={(e) => atualizar({ ...dados, experiencias: dados.experiencias.map((x, j) => (j === i ? { ...x, empresa: e.target.value } : x)) })} />
              <input className={`${campo} sm:col-span-2`} placeholder="Período (ex: jan/2022 - dez/2023)" value={exp.periodo} maxLength={40} onChange={(e) => atualizar({ ...dados, experiencias: dados.experiencias.map((x, j) => (j === i ? { ...x, periodo: e.target.value } : x)) })} />
              <textarea className={`${campo} sm:col-span-2`} rows={3} placeholder="O que você fazia" value={exp.descricao} maxLength={600} onChange={(e) => atualizar({ ...dados, experiencias: dados.experiencias.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} />
              <button type="button" className="text-left text-xs text-red-600 sm:col-span-2" onClick={() => atualizar({ ...dados, experiencias: dados.experiencias.filter((_, j) => j !== i) })}>
                Remover
              </button>
            </div>
          ))}
          {dados.experiencias.length < 6 && (
            <button type="button" className="text-sm text-blue-700" onClick={() => atualizar({ ...dados, experiencias: [...dados.experiencias, { cargo: "", empresa: "", periodo: "", descricao: "" }] })}>
              + Adicionar experiência
            </button>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Formação acadêmica</h2>
          {dados.formacoes.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
              <input className={campo} placeholder="Curso" value={f.curso} maxLength={100} onChange={(e) => atualizar({ ...dados, formacoes: dados.formacoes.map((x, j) => (j === i ? { ...x, curso: e.target.value } : x)) })} />
              <input className={campo} placeholder="Instituição" value={f.instituicao} maxLength={100} onChange={(e) => atualizar({ ...dados, formacoes: dados.formacoes.map((x, j) => (j === i ? { ...x, instituicao: e.target.value } : x)) })} />
              <input className={`${campo} sm:col-span-2`} placeholder="Período (ex: 2020 - 2023)" value={f.periodo} maxLength={40} onChange={(e) => atualizar({ ...dados, formacoes: dados.formacoes.map((x, j) => (j === i ? { ...x, periodo: e.target.value } : x)) })} />
              <button type="button" className="text-left text-xs text-red-600 sm:col-span-2" onClick={() => atualizar({ ...dados, formacoes: dados.formacoes.filter((_, j) => j !== i) })}>
                Remover
              </button>
            </div>
          ))}
          {dados.formacoes.length < 4 && (
            <button type="button" className="text-sm text-blue-700" onClick={() => atualizar({ ...dados, formacoes: [...dados.formacoes, { curso: "", instituicao: "", periodo: "" }] })}>
              + Adicionar formação
            </button>
          )}
        </section>

        <section>
          <label className={rotulo}>Habilidades (separe por vírgula)</label>
          <input className={campo} value={habilidadesTexto} placeholder="Excel, Atendimento ao cliente, Inglês básico" onChange={(e) => definirHabilidades(e.target.value)} />
        </section>
      </form>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Previa dados={dados} />
        <button
          type="button"
          onClick={pagar}
          disabled={pendente || dados.nome.trim().length < 2}
          className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {pendente ? "Abrindo pagamento..." : `Baixar PDF por ${brl(preco)}`}
        </button>
        {dados.nome.trim().length < 2 && <p className="mt-2 text-xs text-slate-500">Preencha seu nome para continuar.</p>}
        {erro && <p role="alert" className="mt-2 text-sm text-red-600">{erro}</p>}
        <p className="mt-2 text-center text-xs text-slate-500">Pagamento único por Pix ou cartão · PDF liberado na hora</p>
      </aside>
    </div>
  );
}

function Titulo({ children, destaque }: { children: string; destaque: string }) {
  return <h3 className={`mt-4 border-b pb-1 text-xs font-bold uppercase ${destaque}`}>{children}</h3>;
}

function Previa({ dados }: { dados: Curriculo }) {
  const moderno = dados.template === "moderno";
  const destaque = moderno ? "text-blue-800 border-blue-800" : "text-slate-900 border-slate-300";
  const contatos = [dados.email, dados.telefone, dados.cidade].filter(Boolean).join("  |  ");
  const experiencias = dados.experiencias.filter((e) => e.cargo || e.empresa);
  const formacoes = dados.formacoes.filter((f) => f.curso || f.instituicao);

  return (
    <div className="aspect-[210/297] overflow-hidden rounded-lg border border-slate-200 bg-white text-[11px] leading-snug shadow-sm">
      <div className={moderno ? "bg-blue-800 px-5 py-4 text-white" : "px-5 pt-5 text-center"}>
        <p className="text-xl font-bold">{dados.nome || "Seu nome"}</p>
        {dados.cargo && <p className={moderno ? "text-blue-100" : "text-slate-500"}>{dados.cargo}</p>}
        {contatos && <p className={`mt-1 text-[10px] ${moderno ? "text-blue-100" : "text-slate-500"}`}>{contatos}</p>}
      </div>
      <div className="px-5 pb-5">
        {dados.resumo && (
          <>
            <Titulo destaque={destaque}>Resumo profissional</Titulo>
            <p className="mt-1 whitespace-pre-line">{dados.resumo}</p>
          </>
        )}
        {experiencias.length > 0 && (
          <>
            <Titulo destaque={destaque}>Experiência profissional</Titulo>
            {experiencias.map((e, i) => (
              <div key={i} className="mt-1">
                <p className="font-bold">{[e.cargo, e.empresa].filter(Boolean).join(" - ")}</p>
                {e.periodo && <p className="text-slate-500">{e.periodo}</p>}
                {e.descricao && <p className="whitespace-pre-line">{e.descricao}</p>}
              </div>
            ))}
          </>
        )}
        {formacoes.length > 0 && (
          <>
            <Titulo destaque={destaque}>Formação acadêmica</Titulo>
            {formacoes.map((f, i) => (
              <div key={i} className="mt-1">
                <p className="font-bold">{[f.curso, f.instituicao].filter(Boolean).join(" - ")}</p>
                {f.periodo && <p className="text-slate-500">{f.periodo}</p>}
              </div>
            ))}
          </>
        )}
        {dados.habilidades.length > 0 && (
          <>
            <Titulo destaque={destaque}>Habilidades</Titulo>
            <p className="mt-1">{dados.habilidades.join("  •  ")}</p>
          </>
        )}
      </div>
    </div>
  );
}
