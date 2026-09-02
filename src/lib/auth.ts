import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        senha: {},
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const senha = String(credentials?.senha ?? "");
        if (!email || !senha) return null;

        const revendedor = await prisma.revendedor.findUnique({ where: { email } });
        if (!revendedor) return null;

        const senhaOk = await bcrypt.compare(senha, revendedor.senhaHash);
        if (!senhaOk) return null;

        return {
          id: revendedor.id,
          name: revendedor.nome,
          email: revendedor.email,
          papel: revendedor.papel,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.papel = (user as { papel?: string }).papel;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.papel = token.papel as "ADMIN" | "REVENDEDOR";
      }
      return session;
    },
  },
});
