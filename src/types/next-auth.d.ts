import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    firebaseEmailVerified?: boolean;
    authProvider?: string;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      profileCompleted?: boolean;
      role?: string;
    };
  }
}
