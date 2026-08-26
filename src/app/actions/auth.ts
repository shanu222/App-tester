"use server";

import { bindAuthUrlToRequest, originFromHeaders } from "@/lib/apply-auth-url";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { googleLoginCallbackUrl } from "@/lib/canonical";

export async function signInWithGoogle() {
  const headerStore = await headers();
  const origin = originFromHeaders(headerStore);
  bindAuthUrlToRequest(origin);
  if (origin) {
    console.info("GOOGLE OAUTH REDIRECT URI:", googleLoginCallbackUrl(origin));
  }
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function signOutAction() {
  const origin = originFromHeaders(await headers());
  bindAuthUrlToRequest(origin);
  await signOut({ redirectTo: "/" });
}
