export const EMAIL_REGISTERED_WITH_GOOGLE =
  "This email is already registered with Google Sign In. Please continue with Google.";
export const EMAIL_REGISTERED_WITH_PASSWORD =
  "This email is already registered with email/password. Please sign in using your email and password.";

export function isGoogleAuthProvider(id: string) {
  return id === "google.com" || id === "google";
}

export function isPasswordAuthProvider(id: string) {
  return id === "password" || id === "email";
}

export function hasGoogleAuthProvider(providers: string[]) {
  return providers.some(isGoogleAuthProvider);
}

export function hasPasswordAuthProvider(providers: string[]) {
  return providers.some(isPasswordAuthProvider);
}

/** Google Sign In is blocked when the email already has an email/password credential. */
export function googleSignInConflictsWithPassword(providers: string[]) {
  return hasPasswordAuthProvider(providers);
}

/** Email/password is blocked when the email is Google-only. */
export function passwordSignInConflictsWithGoogle(providers: string[]) {
  return hasGoogleAuthProvider(providers) && !hasPasswordAuthProvider(providers);
}
