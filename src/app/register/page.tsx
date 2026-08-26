import Link from "next/link";
import { RegisterForm } from "@/components/auth/auth-forms";
import { Card } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">Your testers, campaigns, and credentials stay isolated.</p>
        <div className="mt-6">
          <RegisterForm />
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Already registered? <Link href="/login" className="text-teal-300">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
