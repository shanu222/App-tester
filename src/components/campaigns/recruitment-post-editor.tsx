"use client";

import { useMemo, useState } from "react";
import { generateRecruitmentPost } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/fields";
import { Check, Copy } from "lucide-react";

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
    <Card>
      <CardHeader
        title="Facebook tester post"
        description="Edit before publishing. This never invents a testing opt-in URL."
      />
      <label htmlFor="recruitment-post" className="sr-only">
        Recruitment post
      </label>
      <Textarea
        id="recruitment-post"
        className="mt-5 min-h-48"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        onClick={async () => {
          await navigator.clipboard.writeText(body);
          setCopied(true);
        }}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        {copied ? "Copied" : "Copy post"}
      </Button>
    </Card>
  );
}
