"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      className="min-w-56"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void signIn("google", { callbackUrl: "/dashboard" }).finally(() => setPending(false));
      }}
    >
      {pending ? "Redirecting…" : label}
    </Button>
  );
}
