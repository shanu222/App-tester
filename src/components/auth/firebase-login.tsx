"use client";

import { useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  unlink,
  type User,
} from "firebase/auth";
import { signIn } from "next-auth/react";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { GoogleGlyph } from "@/components/brand/google-glyph";
import { PasswordField } from "@/components/auth/password-field";
import { AuthToast } from "@/components/auth/auth-toast";
import {
  OTP_EXPIRED,
  OTP_INCORRECT,
  OTP_SEND_FAILED,
  OTP_VERIFIED,
  emailActionSettings,
  readableAuthError,
} from "@/lib/auth/firebase-auth-messages";
import {
  EMAIL_REGISTERED_WITH_GOOGLE,
  EMAIL_REGISTERED_WITH_PASSWORD,
  googleSignInConflictsWithPassword,
  passwordSignInConflictsWithGoogle,
} from "@/lib/auth/auth-method-conflict";
import { lookupSignInMethods } from "@/lib/auth/lookup-sign-in-methods";

/** Popup failures that are environmental rather than user error; retry via redirect. */
const POPUP_FALLBACK = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
]);

type OtpResponse = {
  ok?: boolean;
  alreadyVerified?: boolean;
  verified?: boolean;
  error?: string;
  code?: string;
};

function otpErrorMessage(data: OtpResponse, fallback: string) {
  if (data.code === "OTP_INCORRECT") return OTP_INCORRECT;
  if (data.code === "OTP_EXPIRED") return OTP_EXPIRED;
  if (data.code === "OTP_DELIVERY_FAILED") return OTP_SEND_FAILED;
  return data.error || fallback;
}

async function postEmailOtp(body: { action: "send" | "verify"; idToken: string; code?: string }) {
  const response = await fetch("/api/email-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as OtpResponse;
  return { ok: response.ok, data };
}

export function FirebaseLogin() {
  const [mode, setMode] = useState<"signin" | "create" | "reset" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"google" | "email" | "reset" | "otp" | "resend" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const exchangeForSession = useCallback(async (user: User) => {
    const idToken = await user.getIdToken(true);
    const result = await signIn("firebase", { idToken, redirect: false, callbackUrl: "/dashboard" });
    if (!result || result.error) {
      setError("Signed in with Firebase, but TestLoop could not create a session. Try again.");
      setPending(null);
      return false;
    }
    window.location.assign(result.url || "/dashboard");
    return true;
  }, []);

  const completeGoogleSignIn = useCallback(
    async (user: User) => {
      const providers = user.providerData.map((item) => item.providerId);
      if (googleSignInConflictsWithPassword(providers)) {
        try {
          await unlink(user, GoogleAuthProvider.PROVIDER_ID);
        } catch {
          // Keep the existing password credential; do not leave a Google session.
        }
        await firebaseAuth().signOut().catch(() => undefined);
        setToast(EMAIL_REGISTERED_WITH_PASSWORD);
        setPending(null);
        return;
      }
      await exchangeForSession(user);
    },
    [exchangeForSession],
  );

  // Completes a sign-in that fell back to a full-page redirect.
  useEffect(() => {
    let active = true;
    getRedirectResult(firebaseAuth())
      .then((result) => {
        if (active && result?.user) {
          setPending("google");
          return completeGoogleSignIn(result.user);
        }
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof FirebaseError && cause.code === "auth/account-exists-with-different-credential") {
          setToast(EMAIL_REGISTERED_WITH_PASSWORD);
          return;
        }
        setError(readableAuthError(cause));
      });
    return () => {
      active = false;
    };
  }, [completeGoogleSignIn]);

  function reset() {
    setError(null);
    setInfo(null);
  }

  async function withGoogle() {
    reset();
    setPending("google");
    const auth = firebaseAuth();
    try {
      const result = await signInWithPopup(auth, googleProvider());
      await completeGoogleSignIn(result.user);
    } catch (cause) {
      if (cause instanceof FirebaseError && cause.code === "auth/account-exists-with-different-credential") {
        await auth.signOut().catch(() => undefined);
        setToast(EMAIL_REGISTERED_WITH_PASSWORD);
        setPending(null);
        return;
      }
      if (cause instanceof FirebaseError && POPUP_FALLBACK.has(cause.code)) {
        try {
          await signInWithRedirect(auth, googleProvider());
          return;
        } catch (redirectCause) {
          setError(readableAuthError(redirectCause));
        }
      } else {
        setError(readableAuthError(cause));
      }
      setPending(null);
    }
  }

  async function toastIfPasswordConflictsWithGoogle(address: string) {
    const methods = await lookupSignInMethods(address);
    if (passwordSignInConflictsWithGoogle(methods)) {
      setToast(EMAIL_REGISTERED_WITH_GOOGLE);
      return true;
    }
    return false;
  }

  async function passwordUser() {
    const existing = firebaseAuth().currentUser;
    if (existing) return existing;
    const credential = await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
    return credential.user;
  }

  async function sendSignupOtp(user: User) {
    try {
      const idToken = await user.getIdToken(true);
      const { ok, data } = await postEmailOtp({ action: "send", idToken });
      if (data.alreadyVerified) {
        await exchangeForSession(user);
        return "verified" as const;
      }
      if (!ok) {
        setError(otpErrorMessage(data, OTP_SEND_FAILED));
        return "failed" as const;
      }
      return "sent" as const;
    } catch {
      setError(OTP_SEND_FAILED);
      return "failed" as const;
    }
  }

  async function beginEmailOtp(user: User) {
    setCode("");
    setMode("verify");
    const result = await sendSignupOtp(user);
    if (result === "verified") return;
    if (result === "sent") {
      setInfo(`We sent a verification code to ${user.email || email.trim()}.`);
    }
    setPending(null);
  }

  async function withEmail(event: React.FormEvent) {
    event.preventDefault();
    reset();
    setPending("email");
    const auth = firebaseAuth();
    try {
      if (await toastIfPasswordConflictsWithGoogle(email.trim())) {
        setPending(null);
        return;
      }
      const credential =
        mode === "create"
          ? await createUserWithEmailAndPassword(auth, email.trim(), password)
          : await signInWithEmailAndPassword(auth, email.trim(), password);

      if (credential.user.emailVerified) {
        await exchangeForSession(credential.user);
        return;
      }
      if (mode !== "create") {
        const idToken = await credential.user.getIdToken(true);
        const session = await signIn("firebase", { idToken, redirect: false, callbackUrl: "/dashboard" });
        if (session && !session.error) {
          window.location.assign(session.url || "/dashboard");
          return;
        }
      }
      await beginEmailOtp(credential.user);
    } catch (cause) {
      await auth.signOut().catch(() => undefined);
      if (
        cause instanceof FirebaseError &&
        (cause.code === "auth/email-already-in-use" ||
          cause.code === "auth/invalid-credential" ||
          cause.code === "auth/wrong-password" ||
          cause.code === "auth/account-exists-with-different-credential")
      ) {
        if (await toastIfPasswordConflictsWithGoogle(email.trim())) {
          setPending(null);
          return;
        }
      }
      setError(readableAuthError(cause));
      setPending(null);
    }
  }

  async function confirmOtp(event: React.FormEvent) {
    event.preventDefault();
    reset();
    setPending("otp");
    try {
      const user = await passwordUser();
      const idToken = await user.getIdToken(true);
      const { ok, data } = await postEmailOtp({ action: "verify", idToken, code });
      if (!ok) {
        setError(otpErrorMessage(data, OTP_INCORRECT));
        setPending(null);
        return;
      }
      setInfo(OTP_VERIFIED);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      await exchangeForSession(user);
    } catch (cause) {
      setError(readableAuthError(cause));
      setPending(null);
    }
  }

  async function resendOtp() {
    reset();
    setPending("resend");
    try {
      const user = await passwordUser();
      const result = await sendSignupOtp(user);
      if (result === "verified") return;
      if (result === "sent") {
        setInfo(`We sent a verification code to ${user.email || email.trim()}.`);
      }
    } catch (cause) {
      if (await toastIfPasswordConflictsWithGoogle(email.trim())) return;
      setError(readableAuthError(cause));
    } finally {
      setPending(null);
    }
  }

  async function withPasswordReset(event: React.FormEvent) {
    event.preventDefault();
    reset();
    if (!email.trim()) {
      setError("Enter a valid email address.");
      return;
    }
    setPending("reset");
    try {
      if (await toastIfPasswordConflictsWithGoogle(email.trim())) {
        setPending(null);
        return;
      }
      await sendPasswordResetEmail(firebaseAuth(), email.trim(), emailActionSettings("/reset-password"));
      setInfo(`Password reset link sent to ${email.trim()}. Check your inbox for a secure link to choose a new password.`);
    } catch (cause) {
      setError(readableAuthError(cause, "reset"));
    }
    setPending(null);
  }

  function leaveVerify(next: "signin" | "create") {
    void firebaseAuth().signOut().catch(() => undefined);
    setCode("");
    setMode(next);
    reset();
  }

  const busy = pending !== null;
  const heading =
    mode === "create"
      ? "Create your TestLoop account"
      : mode === "reset"
        ? "Forgot password"
        : mode === "verify"
          ? "Verify your email"
          : "Welcome back";
  const subheading =
    mode === "create"
      ? "Join TestLoop to discover and manage software testing opportunities."
      : mode === "reset"
        ? "Enter your registered email address and we will send a password reset link."
        : mode === "verify"
          ? `Enter the code we sent to ${email.trim() || "your email address"} to finish creating your account.`
          : "Sign in to your TestLoop account.";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{subheading}</p>
      </div>

      {mode !== "reset" && mode !== "verify" ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            aria-busy={pending === "google"}
            disabled={busy}
            onClick={withGoogle}
          >
            <GoogleGlyph />
            {pending === "google" ? "Opening Google…" : mode === "create" ? "Continue with Google" : "Google Sign In"}
          </Button>

          <div className="flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}

      {mode === "reset" ? (
        <form className="space-y-4" onSubmit={withPasswordReset}>
          <div>
            <Label htmlFor="firebase-email">Email</Label>
            <Input
              id="firebase-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" className="w-full" aria-busy={pending === "reset"} disabled={busy}>
            {pending === "reset" ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      ) : mode === "verify" ? (
        <form className="space-y-4" onSubmit={(event) => void confirmOtp(event)}>
          <div>
            <Label htmlFor="firebase-otp">Verification code</Label>
            <Input
              id="firebase-otp"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              disabled={busy}
            />
          </div>
          <Button type="submit" className="w-full" aria-busy={pending === "otp"} disabled={busy || code.length < 6}>
            {pending === "otp" ? "Verifying…" : "Verify email"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            aria-busy={pending === "resend"}
            disabled={busy}
            onClick={() => void resendOtp()}
          >
            {pending === "resend" ? "Sending…" : "Resend code"}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={withEmail}>
          <div>
            <Label htmlFor="firebase-email">Email</Label>
            <Input
              id="firebase-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="firebase-password">Password</Label>
              {mode === "signin" ? (
                <button
                  type="button"
                  className="mb-1.5 text-xs font-medium text-brand hover:underline disabled:opacity-60"
                  disabled={busy}
                  onClick={() => {
                    reset();
                    setMode("reset");
                  }}
                >
                  Forgot password?
                </button>
              ) : null}
            </div>
            <PasswordField
              id="firebase-password"
              name="password"
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              disabled={busy}
            />
          </div>

          <Button type="submit" className="w-full" aria-busy={pending === "email"} disabled={busy}>
            {pending === "email" ? "Working…" : mode === "create" ? "Create account" : "Sign in"}
          </Button>
        </form>
      )}

      <p className="text-sm text-muted">
        {mode === "create" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={() => {
                setMode("signin");
                reset();
              }}
            >
              Sign in
            </button>
          </>
        ) : mode === "reset" || mode === "verify" ? (
          <>
            {mode === "verify" ? "Use a different email? " : "Remembered your password? "}
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={() => leaveVerify("signin")}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New to TestLoop?{" "}
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={() => {
                setMode("create");
                reset();
              }}
            >
              Create an account
            </button>
          </>
        )}
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700"
        >
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-5 text-emerald-700">
          {info}
        </p>
      ) : null}
      <AuthToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
