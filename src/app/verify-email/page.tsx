import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login?verify=missing");
  redirect(`/api/verify-email?token=${encodeURIComponent(token)}`);
}
