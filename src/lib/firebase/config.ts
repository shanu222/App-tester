/**
 * Firebase Authentication is a second login path next to Auth.js Google OAuth.
 * Only the public web config lives here. It is safe in the browser bundle:
 * Firebase restricts access by authorized domain, not by hiding the API key.
 */
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ""),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
};

export function firebaseAuthConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

/** Server-side key for the Identity Toolkit lookup used to verify ID tokens. */
export function firebaseServerApiKey() {
  return process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
}
