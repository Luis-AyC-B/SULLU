import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      accessToken?: string;
      rolId?: string;
      permisos?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    accessToken?: string;
    rolId?: string;
    permisos?: string[];
  }
}