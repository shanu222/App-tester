"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/fields";
import { JsonButton } from "@/components/ui/json-button";
import { timeAgo } from "@/lib/utils";

type Item = {
  id: string;
  personName: string | null;
  postContent: string;
  groupName: string | null;
  postTimestamp: string | null;
  postLink: string | null;
  relevanceScore: number;
  relevance: string;
  matchedKeywords: string[];
  testingIntent: string | null;
  previousContact: boolean;
  reciprocal: boolean;
  whyMatched: unknown;
  draftId: string | null;
  draftStatus: string | null;
  draftBody: string | null;
};

export function OpportunityList({
  items,
  campaigns,
}: {
  items: Item[];
  campaigns: Array<{ id: string; name: string }>;
}) {
  const [tone, setTone] = useState("professional");
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id || "");
  const [editing, setEditing] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-card border border-line bg-white p-4 shadow-card">
        <div className="min-w-48 flex-1">
          <label htmlFor="opportunity-campaign" className="mb-1.5 block text-xs font-medium text-muted">
            Campaign
          </label>
          <Select
            id="opportunity-campaign"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="opportunity-tone" className="mb-1.5 block text-xs font-medium text-muted">
            Reply tone
          </label>
          <Select id="opportunity-tone" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="short">Short</option>
            <option value="developer-to-developer">Developer-to-developer</option>
          </Select>
        </div>
      </div>
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{item.personName || "Unknown person"}</span>
                <Badge tone={item.relevanceScore >= 80 ? "good" : item.relevanceScore >= 55 ? "accent" : "warn"}>
                  {item.relevance} · {item.relevanceScore}%
                </Badge>
                {item.previousContact ? <Badge tone="warn">Previously contacted</Badge> : null}
                {item.reciprocal ? <Badge>Reciprocal</Badge> : null}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {item.groupName} · {timeAgo(item.postTimestamp)}
              </p>
            </div>
            {item.postLink ? (
              <a
                className="text-sm font-medium text-brand hover:underline"
                href={item.postLink}
                target="_blank"
                rel="noreferrer"
              >
                View post
              </a>
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-body">{item.postContent}</p>
          <p className="mt-2.5 text-xs text-muted">
            Matched: {item.matchedKeywords.join(", ") || "—"} · Intent: {item.testingIntent}
          </p>
          {item.draftBody ? (
            <div className="mt-4 rounded-control border border-line bg-surface p-3.5">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                Preview · {item.draftStatus}
              </div>
              <Textarea
                value={editing[item.id] ?? item.draftBody}
                onChange={(e) => setEditing((prev) => ({ ...prev, [item.id]: e.target.value }))}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {item.draftId ? (
                  <JsonButton
                    url="/api/facebook/comments"
                    body={{ draftId: item.draftId, body: editing[item.id] ?? item.draftBody }}
                    label="Approve & Post"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <JsonButton
              url={`/api/opportunities/${item.id}`}
              body={{ action: "generate", tone, campaignId }}
              label="Generate reply"
              variant="secondary"
            />
            <JsonButton
              url={`/api/opportunities/${item.id}`}
              body={{ action: "skip" }}
              label="Skip"
              variant="ghost"
            />
            <JsonButton
              url={`/api/opportunities/${item.id}`}
              body={{ action: "ignore", reason: "Not relevant" }}
              label="Report / Ignore"
              variant="danger"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigator.clipboard.writeText(editing[item.id] || item.draftBody || "")}
            >
              Copy reply
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
