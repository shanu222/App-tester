"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";

export function TesterActions({
  testerId,
  testerCampaignId,
  email,
}: {
  testerId: string;
  testerCampaignId: string;
  email: string | null;
}) {
  const [detected, setDetected] = useState(email || "");
  async function patch(body: object) {
    const response = await fetch(`/api/testers/${testerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testerCampaignId, ...body }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Update failed");
      return;
    }
    window.location.reload();
  }
  return (
    <div className="mt-5 rounded-control border border-line bg-surface p-4">
      <Label htmlFor="tester-email">Potential Google Play account email</Label>
      <Input id="tester-email" value={detected} onChange={(e) => setDetected(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => patch({ email: detected, confirmEmail: true })}>
          Confirm
        </Button>
        <Button type="button" variant="secondary" onClick={() => setDetected("")}>
          Reject
        </Button>
        <Button type="button" variant="ghost" onClick={() => patch({ optedIn: true })}>
          Record TestLoop opt-in
        </Button>
        <Button type="button" variant="danger" onClick={() => patch({ block: true })}>
          Block tester
        </Button>
      </div>
      <div className="mt-4">
        <Label htmlFor="tester-status">Change status</Label>
      </div>
      <Select
        id="tester-status"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) patch({ status: e.target.value });
        }}
      >
        <option value="">Select…</option>
        <option value="CONTACTED">CONTACTED</option>
        <option value="REPLIED">REPLIED</option>
        <option value="ADDED">ADDED</option>
        <option value="OPT_IN_PENDING">OPT_IN_PENDING</option>
        <option value="OPTED_IN">OPTED_IN</option>
        <option value="TESTING">TESTING</option>
        <option value="DECLINED">DECLINED</option>
      </Select>
    </div>
  );
}
