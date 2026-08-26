"use client";

import { useMemo, useState } from "react";
import { generateRecruitmentPost } from "@/lib/templates";
import { Button } from "@/components/ui/button";

export function RecruitmentPostEditor({
  appName,
  playStoreUrl,
}: {
  appName: string;
  playStoreUrl?: string | null;
}) {
  const initial = useMemo(
    () => generateRecruitmentPost({ appName, playStoreUrl }),
    [appName, playStoreUrl],
  );
  const [body, setBody] = useState(initial);
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-800 p-5">
      <h2 className="font-medium">Facebook tester post</h2>
      <p className="mt-1 text-xs text-slate-500">
        Edit before publishing. This uses the selected app. It does not invent a testing opt-in URL.
      </p>
      <textarea
        className="mt-3 min-h-48 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        onClick={async () => {
          await navigator.clipboard.writeText(body);
          setCopied(true);
        }}
      >
        {copied ? "Copied" : "Copy post"}
      </Button>
    </div>
  );
}
