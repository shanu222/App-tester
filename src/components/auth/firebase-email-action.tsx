"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/fields";
import { PasswordField } from "@/components/auth/password-field";
import {
  EMAIL_VERIFIED,
  PASSWORD_CHANGED,
  RESET_LINK_INVALID,
  VERIFY_LINK_INVALID,
  readableAuthError,
} from "@/lib/auth/firebase-auth-messages";

type ActionMode = "resetPassword" | "verifyEmail" | "recoverEmail" | "";

export function FirebaseEmailAction() {
  const params = useSearchParams();
  const pathname = usePathname();
  const mode = (params.get("mode") || "") as ActionMode;
  const oobCode = params.get("oobCode") || "";
  const inferred: ActionMode =
    mode ||
    (pathname.includes("verify-email") ? "verifyEmail" : "") ||
    (pathname.includes("reset-password") || oobCode ? "resetPassword" : "");

  if (inferred === "resetPassword") {
    return <ResetPasswordForm oobCode={oobCode} />;
  }
  if (inferred === "verifyEmail" || inferred === "recoverEmail") {
    return <VerifyEmailAction oobCode={oobCode} />;
  }
  return (
    <StatusCard
      title="This link is invalid"
      body={RESET_LINK_INVALID}
    />
  );
}

function ResetPasswordForm({ oobCode }: { oobCode: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    if (!oobCode) {
      setError(RESET_LINK_INVALID);
      setChecking(false);
      return;
    }
    verifyPasswordResetCode(firebaseAuth(), oobCode)
      .then((value) => {
        if (active) setEmail(value);
      })
      .catch((cause) => {
        if (active) setError(readableAuthError(cause, "reset"));
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [oobCode]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("The new password and confirmation do not match.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await confirmPasswordReset(firebaseAuth(), oobCode, password);
      setDone(true);
    } catch (cause) {
      setError(readableAuthError(cause, "reset"));
    } finally {
      setPending(false);
    }
  }

  if (checking) {
    return <p className="text-sm text-muted">Checking this reset link…</p>;
  }
  if (done) {
    return <StatusCard title="Password changed" body={PASSWORD_CHANGED} />;
  }
  if (error && !email) {
    return <StatusCard title="Reset link unavailable" body={error} />;
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          {email ? `Choose a new password for ${email}.` : "Choose a new password for your TestLoop account."}
        </p>
      </div>
      <div>
        <Label htmlFor="reset-password">New password</Label>
        <PasswordField
          id="reset-password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={setPassword}
          placeholder="At least 6 characters"
          disabled={pending}
        />
      </div>
      <div>
        <Label htmlFor="reset-password-confirm">Confirm new password</Label>
        <PasswordField
          id="reset-password-confirm"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={setConfirm}
          placeholder="Re-enter your new password"
          disabled={pending}
        />
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}

function VerifyEmailAction({ oobCode }: { oobCode: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    if (!oobCode) {
      setError(VERIFY_LINK_INVALID);
      return;
    }
    applyActionCode(firebaseAuth(), oobCode)
      .then(() => {
        if (active) setDone(true);
      })
      .catch((cause) => {
        if (active) setError(readableAuthError(cause, "verify"));
      });
    return () => {
      active = false;
    };
  }, [oobCode]);

  const body = useMemo(() => {
    if (done) return EMAIL_VERIFIED;
    if (error) return error;
    return "Verifying your email address…";
  }, [done, error]);

  return (
    <StatusCard
      title={done ? "Email verified" : error ? "Verification link unavailable" : "Verifying email"}
      body={body}
    />
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      </div>
      <Link href="/" className="inline-flex">
        <Button type="button" variant="secondary">
          Back to sign in
        </Button>
      </Link>
    </div>
  );
}
