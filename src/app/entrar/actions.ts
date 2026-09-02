"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function entrarComCredenciais(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  try {
    await signIn("credentials", { email, senha, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha incorretos" };
    }
    throw error;
  }
}
