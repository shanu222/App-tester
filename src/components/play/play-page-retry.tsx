"use client";

import { Button } from "@/components/ui/button";

export function PlayPageRetry() {
  return (
    <Button type="button" variant="secondary" size="sm" onClick={() => window.location.assign("/play")}>
      Try again
    </Button>
  );
}
