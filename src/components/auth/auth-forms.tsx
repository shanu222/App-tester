"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      redirect: false,
    });
    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }
    window.location.href = "/dashboard";
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <Button className="w-full" type="submit">
        Sign in
      </Button>
      {googleEnabled ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continue with Google
        </Button>
      ) : null}
    </form>
  );
}

export function RegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Could not create account.");
      return;
    }
    setMessage(
      data.verificationUrl
        ? `Account created. Verify email: ${data.verificationUrl}`
        : "Account created. Check your email, then sign in.",
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input name="name" required />
      </div>
      <div>
        <Label>Email</Label>
        <Input name="email" type="email" required />
      </div>
      <div>
        <Label>Password</Label>
        <Input name="password" type="password" minLength={8} required />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-teal-300">{message}</p> : null}
      <Button className="w-full" type="submit">
        Create account
      </Button>
    </form>
  );
}
