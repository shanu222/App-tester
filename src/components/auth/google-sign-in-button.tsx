import { signInWithGoogle } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ label = "Continue with Google" }: { label?: string }) {
  return (
    <form action={signInWithGoogle}>
      <Button type="submit" className="min-w-56">
        {label}
      </Button>
    </form>
  );
}
