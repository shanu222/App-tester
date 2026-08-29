import { firebaseConfig, firebaseServerApiKey } from "@/lib/firebase/config";

export type FirebaseIdentity = {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  image?: string;
  provider: string;
  providers: string[];
};

type LookupUser = {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  providerUserInfo?: Array<{ providerId?: string; displayName?: string; photoUrl?: string }>;
};

function decodeClaims(idToken: string) {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  try {
    return JSON.parse(atob(padded)) as {
      aud?: string;
      iss?: string;
      exp?: number;
      firebase?: { sign_in_provider?: string };
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a Firebase ID token through the Identity Toolkit accounts:lookup endpoint.
 * Google validates the signature and expiry there, so no service-account key is needed.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity | null> {
  const apiKey = firebaseServerApiKey();
  const projectId = firebaseConfig.projectId;
  if (!apiKey || !projectId || !idToken) return null;

  const claims = decodeClaims(idToken);
  if (!claims) return null;
  if (claims.aud !== projectId) return null;
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (claims.exp && claims.exp * 1000 <= Date.now()) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as { users?: LookupUser[] };
  const user = data.users?.[0];
  const email = user?.email?.trim().toLowerCase();
  if (!user?.localId || !email) return null;

  const federated = user.providerUserInfo?.find((info) => info.providerId && info.providerId !== "password");
  const providers = (user.providerUserInfo || [])
    .map((info) => info.providerId)
    .filter((id): id is string => Boolean(id));
  const provider = claims.firebase?.sign_in_provider || federated?.providerId || "password";
  return {
    uid: user.localId,
    email,
    emailVerified: Boolean(user.emailVerified),
    name: user.displayName || federated?.displayName || undefined,
    image: user.photoUrl || federated?.photoUrl || undefined,
    provider,
    providers: providers.length ? providers : [provider],
  };
}
