import { redirect } from "next/navigation";

export default async function VerifyNotificationEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  redirect(`/api/notifications/verify${query}`);
}
