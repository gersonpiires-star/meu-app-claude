// Marca "Ciclo": um arco de 300° fechado por um ponto — a mesma forma de um
// ícone de renovação, desenhada pra também se ler como o "G" de GestorPro.
// Sem fundo, pra usar direto sobre o dark do app (menu lateral, cabeçalhos).
// A versão com fundo (favicon, ícone de PWA) fica em public/icon.svg.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeDasharray="167.55 33.51"
      />
      <circle cx="82" cy="50" r="8" fill="var(--accent-strong)" />
    </svg>
  );
}
