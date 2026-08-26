import "@/lib/apply-auth-url";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { AppError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

async function bootstrapDeveloper(input: {
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.deletedAt || existing.suspendedAt) {
      throw new UnauthorizedError("This account is not available.");
    }
    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase() && existing.role !== "ADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name || input.name || undefined,
        image: input.image || existing.image,
        emailVerified: existing.emailVerified ?? new Date(),
      },
    });
    const { ensureCatalogApps } = await import("@/lib/services/apps");
    await ensureCatalogApps(updated.id, email);
    return updated;
  }
  const created = await prisma.user.create({
    data: {
      email,
      name: input.name,
      image: input.image,
      emailVerified: new Date(),
      role: process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.toLowerCase() ? "ADMIN" : "USER",
      settings: { create: {} },
      templates: {
        create: Object.entries(DEFAULT_TEMPLATES).map(([key, value]) => ({
          key,
          name: value.name,
          subject: value.subject,
          body: value.body,
        })),
      },
    },
  });
  const { ensureCatalogApps } = await import("@/lib/services/apps");
  await ensureCatalogApps(created.id, email);
  return created;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;
      await bootstrapDeveloper({ email: user.email, name: user.name, image: user.image });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.trim().toLowerCase() },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          token.profileCompleted = dbUser.profileCompleted;
          token.role = dbUser.role;
        }
      }
      return token;
    },
  },
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  const user = await prisma.user.findFirst({
    where: { id: session.user.id, deletedAt: null, suspendedAt: null },
  });
  if (!user) throw new UnauthorizedError();
  return user;
}

export async function requireUserId() {
  const user = await requireUser();
  return user.id;
}

export async function requireCompleteProfile() {
  const user = await requireUser();
  if (!user.profileCompleted) {
    throw new AppError("Complete your developer profile before creating campaigns.", 403, "PROFILE_INCOMPLETE");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Admin access required.");
  return user;
}
