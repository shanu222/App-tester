import Link from "next/link";
import { LoginForm } from "@/components/auth/auth-forms";
import { googleLoginConfigured } from "@/lib/env";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-400">TesterBridge</p>
        <div className="mt-6">
          <LoginForm googleEnabled={googleLoginConfigured()} />
        </div>
        <p className="mt-4 text-sm text-slate-400">
          No account? <Link href="/register" className="text-teal-300">Create one</Link>
        </p>
        <p className="mt-2 text-sm text-slate-400">
          <Link href="/forgot-password">Forgot password</Link>
        </p>
      </Card>
    </div>
  );
}
