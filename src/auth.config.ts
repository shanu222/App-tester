import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { env, googleOAuthConfigured } from "@/lib/env";

export const authConfig = {
  trustHost: true,
  secret: env.authSecret,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/" },
  providers: googleOAuthConfigured()
    ? [
        Google({
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret,
        }),
      ]
    : [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub || "");
        session.user.email = String(token.email || "");
        session.user.name = token.name as string | undefined;
        session.user.image = token.picture as string | undefined;
        session.user.profileCompleted = Boolean(token.profileCompleted);
        session.user.role = String(token.role || "USER");
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
