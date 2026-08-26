"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-3 text-sm text-slate-400">{error.message}</p>
      <button className="mt-6 text-teal-300" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
