"use client";

import { fetchSignInMethodsForEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { firebaseConfig } from "@/lib/firebase/config";

/**
 * Which Firebase sign-in methods exist for this email. Empty when enumeration
 * protection hides the list; callers then fall back to the Firebase error code.
 */
export async function lookupSignInMethods(email: string): Promise<string[]> {
  const trimmed = email.trim();
  if (!trimmed) return [];
  try {
    const methods = await fetchSignInMethodsForEmail(firebaseAuth(), trimmed);
    if (methods.length) return methods;
  } catch {
    // Fall through to Identity Toolkit; enumeration protection often yields [].
  }

  const apiKey = firebaseConfig.apiKey;
  if (!apiKey || typeof window === "undefined") return [];
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmed, continueUri: `${window.location.origin}/` }),
      },
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { signinMethods?: unknown; allProviders?: unknown };
    const methods = Array.isArray(data.signinMethods)
      ? data.signinMethods
      : Array.isArray(data.allProviders)
        ? data.allProviders
        : [];
    return methods.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}
