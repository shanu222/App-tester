"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { Suspense } from "react";

function ResetInner() {
  const params = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: params.get("token"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Password updated. You can sign in." : data.error);
  }
  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label>New password</Label>
          <Input name="password" type="password" minLength={8} required />
        </div>
        <Button className="w-full">Update password</Button>
      </form>
      {message ? <p className="mt-4 text-sm text-teal-300">{message}</p> : null}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Suspense>
        <ResetInner />
      </Suspense>
    </div>
  );
}
