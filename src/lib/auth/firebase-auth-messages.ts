import { FirebaseError } from "firebase/app";
import type { ActionCodeSettings } from "firebase/auth";

export const VERIFY_BEFORE_SIGN_IN = "Please verify your email address before signing in.";
export const PASSWORD_CHANGED = "Your password has been changed. You can now sign in with your new password.";
export const EMAIL_VERIFIED = "Your email address has been verified. You can now sign in.";
export const RESET_LINK_INVALID = "This reset link is invalid or has expired. Request a new password reset email.";
export const VERIFY_LINK_INVALID =
  "This verification link is invalid or has expired. Request a new verification email.";
export const OTP_INCORRECT = "That verification code is incorrect.";
export const OTP_EXPIRED = "That verification code has expired. Request a new code.";
export const OTP_VERIFIED = "Your email has been verified.";
export const OTP_SEND_FAILED = "We could not send the verification email. Try again.";
export const SIGN_IN_NOT_COMPLETED = "We could not complete sign-in. Try again.";

export function emailActionSettings(path = "/auth/action"): ActionCodeSettings {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return {
    url: `${origin}${path}`,
    handleCodeInApp: false,
  };
}

export function readableAuthError(error: unknown, kind: "auth" | "reset" | "verify" = "auth") {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return kind === "reset"
          ? "No account was found for that email address."
          : "That email and password combination is not correct.";
      case "auth/email-already-in-use":
        return "An account already exists for this email. Sign in instead.";
      case "auth/weak-password":
        return "Choose a password with at least 6 characters.";
      case "auth/invalid-email":
      case "auth/missing-email":
        return "Enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a moment and try again.";
      case "auth/unauthorized-domain":
        return "This website address is not authorized for sign-in.";
      case "auth/account-exists-with-different-credential":
        return SIGN_IN_NOT_COMPLETED;
      case "auth/expired-action-code":
        return kind === "verify" ? VERIFY_LINK_INVALID : RESET_LINK_INVALID;
      case "auth/invalid-action-code":
        return kind === "verify" ? VERIFY_LINK_INVALID : RESET_LINK_INVALID;
      default:
        return SIGN_IN_NOT_COMPLETED;
    }
  }
  return SIGN_IN_NOT_COMPLETED;
}
