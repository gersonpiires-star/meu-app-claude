// Placeholder genérico pra transição entre páginas dentro de (app) — sem
// nenhum loading.tsx, o Next.js só troca a tela quando TODA a página nova
// (dados do servidor incluídos) já carregou, deixando a tela anterior
// congelada no meio da navegação sem nenhum feedback. Isso mostra na hora
// (o layout com sidebar/header não desmonta, só o conteúdo troca por isso
// até os dados chegarem).
//
// Genérico de propósito — cobre as 36 páginas server-rendered do app sem
// precisar de um esqueleto sob medida pra cada uma: título + linha de
// cards pequenos (stat tiles) + bloco de conteúdo maior, o formato que se
// repete na maioria das telas (Painel, Clientes, Vendas, Estoque...).
function Bloco({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Bloco className="h-6 w-40" />
          <Bloco className="h-3.5 w-64" />
        </div>
        <Bloco className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Bloco key={i} className="h-[86px]" />
        ))}
      </div>

      <Bloco className="h-64" />
      <Bloco className="h-40" />
    </div>
  );
}
