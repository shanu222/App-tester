import type { Metadata } from "next";
import { AuthActionShell } from "@/components/auth/auth-action-shell";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Account | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};

export default function AuthActionPage() {
  return <AuthActionShell />;
}
