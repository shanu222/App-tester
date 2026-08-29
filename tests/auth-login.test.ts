import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FirebaseError } from "firebase/app";
import {
  EMAIL_VERIFIED,
  OTP_EXPIRED,
  OTP_INCORRECT,
  OTP_SEND_FAILED,
  OTP_VERIFIED,
  PASSWORD_CHANGED,
  RESET_LINK_INVALID,
  VERIFY_LINK_INVALID,
  readableAuthError,
} from "../src/lib/auth/firebase-auth-messages";
import {
  EMAIL_REGISTERED_WITH_GOOGLE,
  EMAIL_REGISTERED_WITH_PASSWORD,
  googleSignInConflictsWithPassword,
  passwordSignInConflictsWithGoogle,
} from "../src/lib/auth/auth-method-conflict";

function source(file: string) {
  return readFileSync(resolve(file), "utf8");
}

describe("sign-in password visibility and email verification", () => {
  it("adds a show/hide control on password fields without changing Google Sign In", () => {
    const login = source("src/components/auth/firebase-login.tsx");
    const field = source("src/components/auth/password-field.tsx");
    expect(field).toContain('aria-label={label}');
    expect(field).toContain("Show password");
    expect(field).toContain("Hide password");
    expect(field).toContain("<Eye");
    expect(login).toContain("<PasswordField");
    expect(login).toContain("signInWithPopup(auth, googleProvider())");
    expect(login).toContain("signInWithRedirect(auth, googleProvider())");
    expect(login).toContain("Google Sign In");
  });

  it("requires a one-time email code before email/password accounts can use TestLoop", () => {
    const login = source("src/components/auth/firebase-login.tsx");
    const authConfig = source("src/auth.config.ts");
    const middleware = source("src/middleware.ts");
    expect(login).toContain("Verify your email");
    expect(login).toContain("Resend code");
    expect(login).toContain("/api/email-otp");
    expect(login).not.toContain("sendEmailVerification");
    expect(authConfig).toContain('identity.provider === "password" && !identity.emailVerified');
    expect(authConfig).toContain("isPasswordEmailOtpVerified");
    expect(middleware).toContain("/api/email-otp");
    expect(OTP_INCORRECT).toBe("That verification code is incorrect.");
    expect(OTP_EXPIRED).toBe("That verification code has expired. Request a new code.");
    expect(OTP_VERIFIED).toBe("Your email has been verified.");
    expect(OTP_SEND_FAILED).toBe("We could not send the verification email. Try again.");
  });

  it("sends a reset email and handles reset/verify action links", () => {
    const login = source("src/components/auth/firebase-login.tsx");
    const action = source("src/components/auth/firebase-email-action.tsx");
    expect(login).toContain("Forgot password?");
    expect(login).toContain("sendPasswordResetEmail");
    expect(login).toContain('emailActionSettings("/reset-password")');
    expect(action).toContain("confirmPasswordReset");
    expect(action).toContain("verifyPasswordResetCode");
    expect(action).toContain("applyActionCode");
    expect(action).toContain("PASSWORD_CHANGED");
    expect(action).toContain("EMAIL_VERIFIED");
    expect(PASSWORD_CHANGED).toContain("You can now sign in with your new password");
    expect(EMAIL_VERIFIED).toContain("You can now sign in");
    expect(RESET_LINK_INVALID).toContain("invalid or has expired");
    expect(VERIFY_LINK_INVALID).toContain("invalid or has expired");
  });

  it("maps invalid email and expired links to clear messages", () => {
    expect(readableAuthError(new FirebaseError("auth/invalid-email", "x"))).toBe("Enter a valid email address.");
    expect(readableAuthError(new FirebaseError("auth/user-not-found", "x"), "reset")).toBe(
      "No account was found for that email address.",
    );
    expect(readableAuthError(new FirebaseError("auth/expired-action-code", "x"), "reset")).toBe(RESET_LINK_INVALID);
    expect(readableAuthError(new FirebaseError("auth/invalid-action-code", "x"), "verify")).toBe(VERIFY_LINK_INVALID);
  });
});

describe("authentication method conflict", () => {
  it("uses the required toast copy and does not merge methods", () => {
    expect(EMAIL_REGISTERED_WITH_GOOGLE).toBe(
      "This email is already registered with Google Sign In. Please continue with Google.",
    );
    expect(EMAIL_REGISTERED_WITH_PASSWORD).toBe(
      "This email is already registered with email/password. Please sign in using your email and password.",
    );
    expect(passwordSignInConflictsWithGoogle(["google.com"])).toBe(true);
    expect(passwordSignInConflictsWithGoogle(["password"])).toBe(false);
    expect(passwordSignInConflictsWithGoogle(["google.com", "password"])).toBe(false);
    expect(googleSignInConflictsWithPassword(["password"])).toBe(true);
    expect(googleSignInConflictsWithPassword(["google.com"])).toBe(false);

    const login = source("src/components/auth/firebase-login.tsx");
    expect(login).toContain("AuthToast");
    expect(login).toContain("EMAIL_REGISTERED_WITH_GOOGLE");
    expect(login).toContain("EMAIL_REGISTERED_WITH_PASSWORD");
    expect(login).toContain("completeGoogleSignIn");
    expect(login).not.toContain("linkWithPopup");
    expect(login).not.toContain("linkWithCredential");

    const authConfig = source("src/auth.config.ts");
    expect(authConfig).toContain("googleSignInConflictsWithPassword");
    expect(authConfig).toContain("passwordSignInConflictsWithGoogle");
  });
});
