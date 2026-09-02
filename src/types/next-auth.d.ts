import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      funcionario: boolean;
      papel: "ADMIN" | "REVENDEDOR";
    } & DefaultSession["user"];
  }

  interface User {
    tenantId?: string;
    funcionario?: boolean;
    papel?: "ADMIN" | "REVENDEDOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tenantId?: string;
    funcionario?: boolean;
    papel?: "ADMIN" | "REVENDEDOR";
  }
}
