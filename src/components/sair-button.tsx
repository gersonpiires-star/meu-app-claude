"use client";

import { signOut } from "next-auth/react";

export function SairButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ redirectTo: "/entrar" })}
      className={className ?? "text-xs font-semibold text-text-dim hover:text-danger"}
    >
      Sair
    </button>
  );
}
