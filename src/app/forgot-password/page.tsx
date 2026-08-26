"use client";

import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const data = await response.json();
    setMessage(data.resetUrl || "If that account exists, a reset link was generated.");
  }
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Forgot password</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>
          <Button className="w-full">Send reset link</Button>
        </form>
        {message ? <p className="mt-4 break-all text-sm text-teal-300">{message}</p> : null}
        <Link href="/login" className="mt-4 inline-block text-sm text-slate-400">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}
