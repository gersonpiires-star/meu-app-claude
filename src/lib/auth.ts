import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { processarTentativaLogin } from "@/lib/login-seguranca";

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

        // Checagem do bloqueio, verificação de senha e gravação da tentativa
        // rodam atomicamente (trava por e-mail) dentro de
        // processarTentativaLogin — ver o comentário lá pro motivo.
        return processarTentativaLogin(email, async () => {
          const revendedor = await prisma.revendedor.findUnique({ where: { email } });
          if (revendedor) {
            const senhaOk = await bcrypt.compare(senha, revendedor.senhaHash);
            if (!senhaOk) return null;
            return {
              id: revendedor.id,
              tenantId: revendedor.id,
              funcionario: false,
              name: revendedor.nome,
              email: revendedor.email,
              papel: revendedor.papel,
            };
          }

          // Login de funcionário: mesma base de dados do dono (tenantId), só
          // que sem acesso a credenciais de pagamento nem à gestão de equipe.
          const funcionario = await prisma.funcionario.findUnique({ where: { email } });
          if (!funcionario || !funcionario.ativo) return null;
          const senhaOk = await bcrypt.compare(senha, funcionario.senhaHash);
          if (!senhaOk) return null;

          return {
            id: funcionario.id,
            tenantId: funcionario.revendedorId,
            funcionario: true,
            name: funcionario.nome,
            email: funcionario.email,
            papel: "REVENDEDOR" as const,
          };
        });
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.tenantId = (user as { tenantId?: string }).tenantId ?? (user.id as string);
        token.funcionario = (user as { funcionario?: boolean }).funcionario ?? false;
        token.papel = (user as { papel?: string }).papel;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.funcionario = Boolean(token.funcionario);
        session.user.papel = token.papel as "ADMIN" | "REVENDEDOR";
      }
      return session;
    },
  },
});
