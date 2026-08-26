"use server";

import { signIn, signOut } from "@/auth";
import { env } from "@/lib/env";
import { googleLoginCallbackUrl } from "@/lib/canonical";

export async function signInWithGoogle() {
  console.info("GOOGLE OAUTH REDIRECT URI:", googleLoginCallbackUrl(env.appUrl));
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
