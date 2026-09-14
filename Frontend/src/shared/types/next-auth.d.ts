import "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    rolId?: string;
    permisos?: string[];
  }
  interface User {
    accessToken?: string;
    rolId?: string;
  }
}