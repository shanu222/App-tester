"use client";

import { useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
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
  VERIFY_BEFORE_SIGN_IN,
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

export function FirebaseLogin() {
  const [mode, setMode] = useState<"signin" | "create" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"google" | "email" | "reset" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const exchangeForSession = useCallback(async (user: User) => {
    const idToken = await user.getIdToken(true);
    const result = await signIn("firebase", { idToken, redirect: false, callbackUrl: "/dashboard" });
    if (!result || result.error) {
      setError("Signed in with Firebase, but TestLoop could not create a session. Try again.");
      setPending(null);
      return;
    }
    window.location.assign(result.url || "/dashboard");
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

  async function requireVerifiedPasswordUser(user: User) {
    if (user.emailVerified) return true;
    await firebaseAuth().signOut();
    setNeedsVerification(true);
    setInfo(VERIFY_BEFORE_SIGN_IN);
    setPending(null);
    return false;
  }

  async function toastIfPasswordConflictsWithGoogle(address: string) {
    const methods = await lookupSignInMethods(address);
    if (passwordSignInConflictsWithGoogle(methods)) {
      setToast(EMAIL_REGISTERED_WITH_GOOGLE);
      return true;
    }
    return false;
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

      if (!credential.user.emailVerified) {
        if (mode === "create") {
          await sendEmailVerification(credential.user, emailActionSettings("/verify-email"));
        }
        await requireVerifiedPasswordUser(credential.user);
        return;
      }
      setNeedsVerification(false);
      await exchangeForSession(credential.user);
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

  async function resendVerification() {
    reset();
    if (!email.trim() || !password) {
      setError("Enter the email and password for this account, then resend the verification email.");
      return;
    }
    setPending("verify");
    const auth = firebaseAuth();
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (credential.user.emailVerified) {
        setNeedsVerification(false);
        await exchangeForSession(credential.user);
        return;
      }
      await sendEmailVerification(credential.user, emailActionSettings("/verify-email"));
      await auth.signOut();
      setNeedsVerification(true);
      setInfo(VERIFY_BEFORE_SIGN_IN);
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

  const busy = pending !== null;
  const heading =
    mode === "create" ? "Create your TestLoop account" : mode === "reset" ? "Forgot password" : "Welcome back";
  const subheading =
    mode === "create"
      ? "Join TestLoop to discover and manage software testing opportunities."
      : mode === "reset"
        ? "Enter your registered email address and we will send a password reset link."
        : "Sign in to your TestLoop account.";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{subheading}</p>
      </div>

      {mode !== "reset" ? (
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

      {needsVerification && mode !== "reset" ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          aria-busy={pending === "verify"}
          disabled={busy}
          onClick={() => void resendVerification()}
        >
          {pending === "verify" ? "Sending…" : "Resend verification email"}
        </Button>
      ) : null}

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
        ) : mode === "reset" ? (
          <>
            Remembered your password?{" "}
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
        ) : (
          <>
            New to TestLoop?{" "}
            <button
              type="button"
              className="font-medium text-brand hover:underline"
              onClick={() => {
                setMode("create");
                reset();
                setNeedsVerification(false);
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
