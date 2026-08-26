"use server";

import { bindAuthUrlToRequest, originFromHeaders } from "@/lib/apply-auth-url";
import { headers } from "next/headers";
import { signOut } from "@/auth";

/**
 * Signing in happens client-side through Firebase, so there is no server-side
 * sign-in action. Only sign-out needs the request origin bound to Auth.js.
 */
export async function signOutAction() {
  const origin = originFromHeaders(await headers());
  bindAuthUrlToRequest(origin);
  await signOut({ redirectTo: "/" });
}
