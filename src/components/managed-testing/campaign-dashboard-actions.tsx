"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { InfoPopover } from "@/components/ui/info-popover";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { NOTIFICATION_TIMEZONES } from "@/lib/notifications/schedule";
import {
  ASSIGNMENT_STATUS_LABELS,
  assignmentStatusTone,
  confirmationLabel,
  invitationLabel,
  optInLabel,
} from "@/lib/managed-testing/labels";
import type { ManagedAssignmentStatus } from "@prisma/client";

type TesterRow = {
  publicId: string;
  label: string;
  name: string;
  playEmail: string;
  invitationStatus: string;
  optInStatus: string;
  confirmationStatus: string;
  testingStatus: ManagedAssignmentStatus;
  hasScreenshot: boolean;
};

export function CampaignDashboardActions({
  publicId,
  testers,
  reportEmailEnabled,
  reportFrequency,
  reportTime,
  reportTimezone,
  whatsappNumber,
  whatsappAvailable,
}: {
  publicId: string;
  testers: TesterRow[];
  reportEmailEnabled: boolean;
  reportFrequency: string;
  reportTime: string;
  reportTimezone: string;
  whatsappNumber: string | null;
  whatsappAvailable: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(reportEmailEnabled);
  const [frequency, setFrequency] = useState(reportFrequency);
  const [time, setTime] = useState(reportTime);
  const [timezone, setTimezone] = useState(reportTimezone);
  const [whatsapp, setWhatsapp] = useState(whatsappNumber || "");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTester, setOpenTester] = useState<string | null>(null);

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setPending(action);
    setError(null);
    setMessage(null);
    const response = await fetch(`/api/managed-testing/${publicId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await response.json();
    setPending(null);
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Unable to update this campaign.");
      return false;
    }
    router.refresh();
    return true;
  }

  const selected = testers.find((row) => row.publicId === openTester);

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Tester</Th>
              <Th>Invitation</Th>
              <Th>Opt-in</Th>
              <Th>Confirmation</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {testers.length === 0 ? (
              <tr>
                <Td colSpan={6} className="text-muted">
                  Consenting testers will appear here as TestLoop assigns them.
                </Td>
              </tr>
            ) : (
              testers.map((row) => (
                <Tr key={row.publicId}>
                  <Td className="font-medium text-slate-900">{row.label}</Td>
                  <Td>{invitationLabel(row.invitationStatus)}</Td>
                  <Td>{optInLabel(row.optInStatus)}</Td>
                  <Td>{confirmationLabel(row.confirmationStatus)}</Td>
                  <Td>
                    <Badge tone={assignmentStatusTone(row.testingStatus)}>
                      {ASSIGNMENT_STATUS_LABELS[row.testingStatus]}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setOpenTester(row.publicId)}>
                        View Tester
                      </Button>
                      {row.confirmationStatus !== "CONFIRMED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending !== null}
                          onClick={() =>
                            void post("reminder", { assignmentPublicId: row.publicId }).then((ok) => {
                              if (ok) setMessage("Reminder sent.");
                            })
                          }
                        >
                          Send Reminder
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/managed-testing/${publicId}?export=csv`}>
          <Button type="button" variant="secondary">
            Export Report
          </Button>
        </a>
      </div>

      <div className="rounded-card border border-line bg-white p-5 shadow-card">
        <div className="flex items-center gap-0.5">
          <h3 className="text-[15px] font-semibold text-slate-900">Email reports</h3>
          <InfoPopover title="Email reports">
            Reports go to your verified notification email in Settings. Changing that address requires verification and
            does not change your login email.
          </InfoPopover>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-control border border-line px-3 py-2">
            <span className="text-sm font-medium">Master switch</span>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-sm font-semibold ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
              onClick={() => setEnabled((value) => !value)}
            >
              {enabled ? "ON" : "OFF"}
            </button>
          </div>
          <Select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="COMPLETION">Campaign completion only</option>
          </Select>
          <Input type="time" value={time} onChange={(event) => setTime(event.target.value || "16:00")} />
          <Select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {NOTIFICATION_TIMEZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-4">
          <label htmlFor="wa" className="text-sm font-medium text-slate-700">
            WhatsApp number
          </label>
          <Input
            id="wa"
            className="mt-1.5 max-w-sm"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="+92…"
          />
          <p className="mt-1.5 text-sm text-muted">
            {whatsappAvailable
              ? "Reports can be sent after this number is verified through WhatsApp Business."
              : "WhatsApp reporting will become available when the service is connected."}
          </p>
        </div>
        <Button
          className="mt-4"
          type="button"
          disabled={pending !== null}
          onClick={() =>
            void post("reports", {
              reportEmailEnabled: enabled,
              reportFrequency: frequency,
              reportTime: time,
              reportTimezone: timezone,
              whatsappNumber: whatsapp || null,
            }).then((ok) => {
              if (ok) setMessage("Report preferences saved.");
            })
          }
        >
          Save report settings
        </Button>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setOpenTester(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-card border border-line bg-white p-5 shadow-overlay"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">{selected.label}</h2>
            <p className="mt-2 text-sm text-muted">{selected.name}</p>
            <p className="mt-4 text-sm font-medium text-slate-700">Google Play email</p>
            <p className="mt-1 font-mono text-sm text-slate-800">{selected.playEmail}</p>
            <div className="mt-3">
              <CopyButton value={selected.playEmail} label="Copy Play email" />
            </div>
            {selected.hasScreenshot ? (
              <a
                className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
                href={`/api/managed-testing/screenshots/${selected.publicId}`}
                target="_blank"
                rel="noreferrer"
              >
                View screenshot
              </a>
            ) : null}
            <div className="mt-5 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpenTester(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
