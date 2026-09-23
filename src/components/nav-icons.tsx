// Ícones simples da navegação inferior (mobile) — linha fina, mesmo estilo
// do ChevronIcon já usado no app (stroke, sem preenchimento, pontas
// arredondadas). Desenhados à mão em vez de puxar uma lib de ícones só pra
// isso.
import { SVGProps } from "react";

function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function IconPainel(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </Base>
  );
}

export function IconPessoas(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M14.8 12.2c2.6.2 4.7 2.4 4.7 5.3" />
    </Base>
  );
}

export function IconTag(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M11.5 3.5H5A1.5 1.5 0 0 0 3.5 5v6.5c0 .4.16.78.44 1.06l8.5 8.5a1.5 1.5 0 0 0 2.12 0l6.5-6.5a1.5 1.5 0 0 0 0-2.12l-8.5-8.5a1.5 1.5 0 0 0-1.06-.44Z" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconPessoaMais(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="10" cy="8" r="3.3" />
      <path d="M3.5 20.5c0-3.9 2.9-6.5 6.5-6.5.8 0 1.5.12 2.2.35" />
      <path d="M17 14v5M14.5 16.5h5" />
    </Base>
  );
}

export function IconPontos(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function IconSacola(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 8h12l1 12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20.5L6 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </Base>
  );
}

export function IconCaixa(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.7 7.7 12 12l8.3-4.3M12 12v9" />
    </Base>
  );
}

export function IconGrafico(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V6M17 20v-9" />
    </Base>
  );
}

export function IconCamadas(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3 2 8l10 5 10-5z" />
      <path d="m2 16 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </Base>
  );
}

export function IconEtiqueta(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </Base>
  );
}

export function IconAjustes(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </Base>
  );
}

export function IconAjuda(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5" />
      <path d="M12 17h.01" />
    </Base>
  );
}

export function IconLivro(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </Base>
  );
}

export function IconEscudo(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />
    </Base>
  );
}
