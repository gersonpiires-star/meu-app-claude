// Mesmo raciocínio do loading.tsx de (app) (ver o comentário lá): sem isso,
// navegar entre as telas do admin (Painel, Assinantes, Cupons...) deixava a
// tela anterior congelada até os dados da próxima chegarem — só o lado do
// revendedor tinha esse feedback, o admin (rota irmã, fora do grupo (app))
// ficava sem.
function Bloco({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-surface-2 ${className}`} />;
}

export default function LoadingAdmin() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <Bloco className="h-28" />
        <Bloco className="h-28" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Bloco key={i} className="h-24" />
        ))}
      </div>

      <Bloco className="h-64" />
      <Bloco className="h-40" />
    </div>
  );
}
