"use client";

import { useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { signIn } from "next-auth/react";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { GoogleGlyph } from "@/components/brand/google-glyph";

/** Popup failures that are environmental rather than user error; retry via redirect. */
const POPUP_FALLBACK = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
]);

function readableError(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "That email and password combination is not correct.";
      case "auth/email-already-in-use":
        return "An account already exists for this email. Sign in instead.";
      case "auth/weak-password":
        return "Choose a password with at least 6 characters.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a moment and try again.";
      case "auth/unauthorized-domain":
        return "This hostname is not in the Firebase authorized domains list.";
      case "auth/account-exists-with-different-credential":
        return "This email already uses a different sign-in method. Use Google instead.";
      default:
        return error.message.replace("Firebase: ", "");
    }
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}

export function FirebaseLogin() {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"google" | "email" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  // Completes a sign-in that fell back to a full-page redirect.
  useEffect(() => {
    let active = true;
    getRedirectResult(firebaseAuth())
      .then((result) => {
        if (active && result?.user) {
          setPending("google");
          return exchangeForSession(result.user);
        }
      })
      .catch((cause) => {
        if (active) setError(readableError(cause));
      });
    return () => {
      active = false;
    };
  }, [exchangeForSession]);

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
      await exchangeForSession(result.user);
    } catch (cause) {
      if (cause instanceof FirebaseError && POPUP_FALLBACK.has(cause.code)) {
        try {
          await signInWithRedirect(auth, googleProvider());
          return;
        } catch (redirectCause) {
          setError(readableError(redirectCause));
        }
      } else {
        setError(readableError(cause));
      }
      setPending(null);
    }
  }

  async function withEmail(event: React.FormEvent) {
    event.preventDefault();
    reset();
    setPending("email");
    const auth = firebaseAuth();
    try {
      const credential =
        mode === "create"
          ? await createUserWithEmailAndPassword(auth, email.trim(), password)
          : await signInWithEmailAndPassword(auth, email.trim(), password);

      // Password accounts must prove the address before they get a session.
      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user);
        await auth.signOut();
        setInfo(`Verification email sent to ${email.trim()}. Confirm it, then sign in.`);
        setPending(null);
        return;
      }
      await exchangeForSession(credential.user);
    } catch (cause) {
      setError(readableError(cause));
      setPending(null);
    }
  }

  async function withPasswordReset() {
    reset();
    if (!email.trim()) {
      setError("Enter your email address first, then request a reset link.");
      return;
    }
    setPending("reset");
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim());
      setInfo(`Password reset link sent to ${email.trim()}.`);
    } catch (cause) {
      setError(readableError(cause));
    }
    setPending(null);
  }

  const busy = pending !== null;

  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        aria-busy={pending === "google"}
        disabled={busy}
        onClick={withGoogle}
      >
        <GoogleGlyph />
        {pending === "google" ? "Opening Google…" : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

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
                onClick={withPasswordReset}
              >
                {pending === "reset" ? "Sending…" : "Forgot password?"}
              </button>
            ) : null}
          </div>
          <Input
            id="firebase-password"
            name="password"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <Button type="submit" className="w-full" aria-busy={pending === "email"} disabled={busy}>
          {pending === "email"
            ? "Working…"
            : mode === "create"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="text-sm text-muted">
        {mode === "create" ? "Already have an account?" : "New to TestLoop?"}{" "}
        <button
          type="button"
          className="font-medium text-brand hover:underline"
          onClick={() => {
            setMode(mode === "create" ? "signin" : "create");
            reset();
          }}
        >
          {mode === "create" ? "Sign in" : "Create an account"}
        </button>
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
    </div>
  );
}
