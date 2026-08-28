"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/fields";
import { InfoPopover } from "@/components/ui/info-popover";
import { fieldsForManagedTestingType } from "@/lib/managed-testing/setup";
import Link from "next/link";

type AppOption = {
  id: string;
  name: string;
  testingType: "INTERNAL" | "CLOSED" | "OPEN";
  hasTestingLink: boolean;
  playConnected: boolean;
};

export function CampaignSetupForm({
  publicId,
  apps,
  initial,
}: {
  publicId: string;
  apps: AppOption[];
  initial?: {
    appId?: string | null;
    testingType?: string;
    testingUrl?: string | null;
    testingInstructions?: string | null;
  };
}) {
  const router = useRouter();
  const [appId, setAppId] = useState(initial?.appId || apps[0]?.id || "");
  const [testingType, setTestingType] = useState<"INTERNAL" | "CLOSED" | "OPEN">(
    (initial?.testingType as "INTERNAL" | "CLOSED" | "OPEN") || "CLOSED",
  );
  const [testingUrl, setTestingUrl] = useState(initial?.testingUrl || "");
  const [instructions, setInstructions] = useState(initial?.testingInstructions || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fields = useMemo(() => fieldsForManagedTestingType(testingType), [testingType]);

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/managed-testing/${publicId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "setup",
        appId,
        testingType,
        testingUrl,
        testingInstructions: instructions,
      }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to save this campaign.");
      return;
    }
    router.push(`/managed-testing/${publicId}/confirm`);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <section>
        <div className="mb-1.5 flex items-center gap-0.5">
          <h2 className="text-sm font-medium text-slate-800">Step 1 — Select app</h2>
          <InfoPopover title="Select app">
            Choose an app already in TestLoop, or add one from My Apps. Google Play Console is not required for
            manually listed apps.
          </InfoPopover>
        </div>
        {apps.length === 0 ? (
          <p className="text-sm text-muted">
            No apps yet.{" "}
            <Link href="/apps" className="font-medium text-brand hover:underline">
              Add an app
            </Link>{" "}
            or{" "}
            <Link href="/play" className="font-medium text-brand hover:underline">
              sync from Google Play
            </Link>
            .
          </p>
        ) : (
          <Select id="managed-app" value={appId} onChange={(event) => setAppId(event.target.value)}>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </Select>
        )}
      </section>

      <section>
        <h2 className="mb-1.5 text-sm font-medium text-slate-800">Step 2 — Testing type</h2>
        <Select
          id="managed-type"
          value={testingType}
          onChange={(event) => setTestingType(event.target.value as "INTERNAL" | "CLOSED" | "OPEN")}
        >
          <option value="INTERNAL">Internal testing</option>
          <option value="CLOSED">Closed testing</option>
          <option value="OPEN">Open testing</option>
        </Select>
        {fields.testingUrl ? (
          <div className="mt-4">
            <label htmlFor="managed-url" className="text-sm font-medium text-slate-700">
              {testingType === "OPEN" ? "Public testing link" : "Testing link"}
            </label>
            <Input
              id="managed-url"
              className="mt-1.5"
              type="url"
              value={testingUrl}
              onChange={(event) => setTestingUrl(event.target.value)}
              placeholder="https://play.google.com/apps/testing/…"
              required
            />
          </div>
        ) : null}
        {fields.testingInstructions ? (
          <div className="mt-4">
            <label htmlFor="managed-instructions" className="text-sm font-medium text-slate-700">
              Testing instructions
            </label>
            <Textarea
              id="managed-instructions"
              className="mt-1.5"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="How testers should join and what to look for."
            />
          </div>
        ) : null}
        {fields.requiredTestersNote ? (
          <p className="mt-2 text-sm text-muted">
            Required testers match your purchased package. TestLoop coordinates consenting participants; Google Play
            still decides production access.
          </p>
        ) : null}
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={pending || !appId}>
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
