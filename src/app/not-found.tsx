import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <Link href="/dashboard" className="mt-4 inline-block text-teal-300">
        Back to dashboard
      </Link>
    </div>
  );
}
