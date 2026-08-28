"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import Link from "next/link";

type AppOption = {
  id: string;
  name: string;
  testingType: "INTERNAL" | "CLOSED" | "OPEN";
  hasTestingLink: boolean;
  playConnected: boolean;
};

export function UsdTwelveCheckoutForm({ apps }: { apps: AppOption[] }) {
  const router = useRouter();
  const [appId, setAppId] = useState(apps[0]?.id || "");
  const selected = useMemo(() => apps.find((app) => app.id === appId), [apps, appId]);
  const [testingType, setTestingType] = useState<"INTERNAL" | "CLOSED" | "OPEN">(
    selected?.testingType || "CLOSED",
  );
  const [testingUrl, setTestingUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/managed-testing/usd-twelve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId, testingType, testingUrl }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to start checkout.");
      return;
    }
    router.push(`/managed-testing/payments/${data.paymentPublicId}`);
  }

  if (apps.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-700">
          Add an app first, then return here to purchase Managed Beta Testing.
        </p>
        <Link href="/apps">
          <Button type="button">Go to My Apps</Button>
        </Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void buy();
      }}
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="usd12-app">
          App
        </label>
        <Select
          id="usd12-app"
          value={appId}
          onChange={(event) => {
            const next = event.target.value;
            setAppId(next);
            const app = apps.find((item) => item.id === next);
            if (app) setTestingType(app.testingType);
          }}
        >
          {apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="usd12-type">
          Testing type
        </label>
        <Select
          id="usd12-type"
          value={testingType}
          onChange={(event) => setTestingType(event.target.value as "INTERNAL" | "CLOSED" | "OPEN")}
        >
          <option value="INTERNAL">Internal</option>
          <option value="CLOSED">Closed</option>
          <option value="OPEN">Open</option>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="usd12-url">
          Google Play testing link
        </label>
        <Input
          id="usd12-url"
          type="url"
          required
          placeholder="https://play.google.com/apps/testing/..."
          value={testingUrl}
          onChange={(event) => setTestingUrl(event.target.value)}
        />
        <p className="mt-1.5 text-xs leading-5 text-muted">
          Testers receive this opt-in or download URL. TestLoop does not claim Google Play verified the install.
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Starting…" : "BUY FOR $10"}
      </Button>
    </form>
  );
}
