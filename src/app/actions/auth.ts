"use server";

import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { googleLoginCallbackUrl } from "@/lib/canonical";

export async function signInWithGoogle() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const proto = headerStore.get("x-forwarded-proto") || "https";
  if (host) {
    console.info("GOOGLE OAUTH REDIRECT URI:", googleLoginCallbackUrl(`${proto}://${host.split(",")[0].trim()}`));
  }
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
