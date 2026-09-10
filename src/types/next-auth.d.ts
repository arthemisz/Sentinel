import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      githubId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    githubId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    githubId?: string | null;
  }
}
