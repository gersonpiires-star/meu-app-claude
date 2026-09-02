import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      papel: "ADMIN" | "REVENDEDOR";
    } & DefaultSession["user"];
  }

  interface User {
    papel?: "ADMIN" | "REVENDEDOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    papel?: "ADMIN" | "REVENDEDOR";
  }
}
