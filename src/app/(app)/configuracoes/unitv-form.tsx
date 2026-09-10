"use client";

import { useRef, useState, useTransition } from "react";
import { Badge, Button, Field, Input } from "@/components/ui";
import { salvarCredenciaisUnitv, removerCredenciaisUnitv, testarConexaoUnitv } from "./actions";
import { dataCurta } from "@/lib/format";

export function UnitvForm({
  usuarioAtual,
  conectadoEm,
}: {
  usuarioAtual: string | null;
  conectadoEm: Date | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();
  const [testando, iniciarTeste] = useTransition();
  const [removendo, iniciarRemocao] = useTransition();

  const conectado = Boolean(usuarioAtual);

  function salvar(formData: FormData) {
    iniciarTransicao(async () => {
      const resposta = await salvarCredenciaisUnitv(formData);
      if ("ok" in resposta) {
        setResultado({ ok: true, texto: "Conectado! O login na UniTV funcionou." });
        formRef.current?.reset();
      } else {
        setResultado({ ok: false, texto: resposta.erro });
      }
    });
  }

  function testar() {
    iniciarTeste(async () => {
      const resposta = await testarConexaoUnitv();
      setResultado("ok" in resposta ? { ok: true, texto: "Conexão funcionando." } : { ok: false, texto: resposta.erro });
    });
  }

  function remover() {
    iniciarRemocao(async () => {
      await removerCredenciaisUnitv();
      setResultado(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {conectado ? (
        <div className="flex items-center justify-between rounded-xl border border-border-strong bg-surface-2 px-3.5 py-2.5">
          <div>
            <p className="text-sm font-semibold text-text">{usuarioAtual}</p>
            <p className="text-xs text-text-dim">
              {conectadoEm ? `Testado com sucesso em ${dataCurta(conectadoEm)}` : "Ainda não testado com sucesso"}
            </p>
          </div>
          <Badge tone={conectadoEm ? "accent" : "warning"}>{conectadoEm ? "Conectado" : "Pendente"}</Badge>
        </div>
      ) : null}

      {resultado ? <p className={resultado.ok ? "text-sm text-accent" : "text-sm text-danger"}>{resultado.texto}</p> : null}

      {conectado ? (
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={testar} disabled={testando} className="flex-1">
            {testando ? "Testando…" : "Testar conexão"}
          </Button>
          <Button type="button" variant="danger" onClick={remover} disabled={removendo} className="flex-1">
            {removendo ? "Removendo…" : "Desconectar"}
          </Button>
        </div>
      ) : (
        <form ref={formRef} action={salvar} className="flex flex-col gap-3">
          <Field label="Usuário da UniTV">
            <Input name="unitvUsuario" autoComplete="off" required />
          </Field>
          <Field label="Senha da UniTV">
            <Input type="password" name="unitvSenha" autoComplete="off" required />
          </Field>
          <Button type="submit" disabled={pendente} className="w-full">
            {pendente ? "Conectando…" : "Conectar conta"}
          </Button>
        </form>
      )}
    </div>
  );
}
