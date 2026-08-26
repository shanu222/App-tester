import "@/lib/apply-auth-url";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { recordAuthError } from "@/lib/auth-error";
import { env, googleOAuthConfigured } from "@/lib/env";
import { firebaseAuthConfigured } from "@/lib/firebase/config";
import { verifyFirebaseIdToken } from "@/lib/firebase/verify";

/**
 * Firebase Authentication (Google popup or email/password) happens in the browser.
 * The resulting ID token is exchanged here for a normal TestLoop session, so roles,
 * middleware, and the Prisma user record behave the same as Auth.js Google login.
 */
const firebaseProvider = Credentials({
  id: "firebase",
  name: "Firebase",
  credentials: { idToken: { label: "Firebase ID token", type: "text" } },
  async authorize(credentials) {
    const idToken = typeof credentials?.idToken === "string" ? credentials.idToken : "";
    if (!idToken) return null;
    const identity = await verifyFirebaseIdToken(idToken);
    if (!identity) return null;
    if (identity.provider === "password" && !identity.emailVerified) return null;
    return {
      id: identity.uid,
      email: identity.email,
      name: identity.name ?? null,
      image: identity.image ?? null,
    };
  },
});

export const authConfig = {
  trustHost: true,
  basePath: "/api/auth",
  secret: env.authSecret,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/", error: "/login-error" },
  logger: {
    error: recordAuthError,
    warn(code) {
      console.warn("[testloop][auth]", code);
    },
  },
  providers: [
    ...(googleOAuthConfigured()
      ? [
          Google({
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          }),
        ]
      : []),
    ...(firebaseAuthConfigured() ? [firebaseProvider] : []),
  ],
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
