"use client";

import { useCallback, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { signIn } from "next-auth/react";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

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
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const exchangeForSession = useCallback(async (user: User) => {
    const idToken = await user.getIdToken(true);
    const result = await signIn("firebase", { idToken, redirect: false, callbackUrl: "/dashboard" });
    if (!result || result.error) {
      setError("TestLoop could not create a session for this account. Try again.");
      return;
    }
    window.location.assign(result.url || "/dashboard");
  }, []);

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

  async function withGoogle() {
    setError(null);
    setInfo(null);
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
    setError(null);
    setInfo(null);
    setPending("email");
    const auth = firebaseAuth();
    try {
      const credential =
        mode === "create"
          ? await createUserWithEmailAndPassword(auth, email.trim(), password)
          : await signInWithEmailAndPassword(auth, email.trim(), password);

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

  return (
    <div className="rounded-xl border border-slate-800 bg-card p-5">
      <h2 className="text-sm font-medium text-slate-200">Firebase sign-in</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Use your Google account or an email and password.
      </p>

      <Button
        type="button"
        variant="secondary"
        className="mt-4 w-full"
        disabled={pending !== null}
        onClick={withGoogle}
      >
        {pending === "google" ? "Opening Google…" : "Google (Firebase)"}
      </Button>

      <form className="mt-4 space-y-3" onSubmit={withEmail}>
        <div>
          <Label htmlFor="firebase-email">Email</Label>
          <Input
            id="firebase-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@gmail.com"
          />
        </div>
        <div>
          <Label htmlFor="firebase-password">Password</Label>
          <Input
            id="firebase-password"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending !== null}>
          {pending === "email"
            ? "Working…"
            : mode === "create"
              ? "Create account"
              : "Sign in with email"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-3 text-xs text-emerald-300 hover:underline"
        onClick={() => {
          setMode(mode === "create" ? "signin" : "create");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "create" ? "I already have an account" : "Create an account with email"}
      </button>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {info ? <p className="mt-3 text-sm text-emerald-300">{info}</p> : null}
    </div>
  );
}
