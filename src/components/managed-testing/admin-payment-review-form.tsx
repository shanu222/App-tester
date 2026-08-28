"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/fields";

export function AdminPaymentReviewForm({
  publicId,
  canApprove,
  canReject,
}: {
  publicId: string;
  canApprove: boolean;
  canReject: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "approve" | "reject") {
    setPending(action);
    setError(null);
    const response = await fetch("/api/admin/managed-testing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, paymentPublicId: publicId, adminNote: note }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(null);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "The payment could not be updated.");
      return;
    }
    router.refresh();
  }

  if (!canApprove && !canReject) return null;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="adminNote">Internal note</Label>
        <Textarea
          id="adminNote"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={canReject ? "Required when rejecting. Visible to the developer after rejection." : "Optional note stored with this review."}
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {canApprove ? (
          <Button type="button" disabled={pending !== null} onClick={() => void run("approve")}>
            {pending === "approve" ? "Approving…" : "Approve payment"}
          </Button>
        ) : null}
        {canReject ? (
          <Button type="button" variant="danger" disabled={pending !== null} onClick={() => void run("reject")}>
            {pending === "reject" ? "Rejecting…" : "Reject payment"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
