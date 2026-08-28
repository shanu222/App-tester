"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/fields";
import { InfoModal } from "@/components/ui/info-modal";
import { InfoPopover } from "@/components/ui/info-popover";
import type { NotificationPreferences } from "@/lib/notifications/preferences";
import {
  NOTIFICATION_TIMEZONES,
  type NotificationFrequency,
} from "@/lib/notifications/schedule";

type SettingsView = {
  notificationEmail: string | null;
  verified: boolean;
  pendingEmail: string | null;
  enabled: boolean;
  lastNotificationSentAt: string | null;
  lastDailySummaryStatus: string | null;
  smtpConfigured: boolean;
  preferences: NotificationPreferences;
  frequency?: NotificationFrequency;
  time?: string;
  timezone?: string;
  weekday?: number;
  recent: Array<{
    id: string;
    type: string;
    to: string;
    status: string;
    subject: string | null;
    createdAt: string;
  }>;
};

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

function formatWhen(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function typeLabel(type: string) {
  if (type === "tester_joined") return "New tester request";
  if (type === "tester_confirmed") return "Tester confirmation";
  if (type === "tester_approved") return "Tester approved";
  if (type === "tester_action_required") return "Google Play action required";
  if (type === "daily_summary") return "Daily summary";
  if (type === "weekly_summary") return "Weekly summary";
  if (type === "test_email") return "Test email";
  if (type === "verification") return "Verification email";
  if (type === "play_sync_issue") return "Google Play synchronization";
  if (type === "play_track_change") return "Track status change";
  if (type === "tester_onboarding_issue") return "Tester onboarding issue";
  return type.replaceAll("_", " ");
}

function statusMark(status: string) {
  if (status === "sent") return "✓";
  if (status === "failed") return "⚠";
  return "○";
}

function FieldLabel({
  htmlFor,
  children,
  infoTitle,
  info,
}: {
  htmlFor?: string;
  children: ReactNode;
  infoTitle: string;
  info: ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-0.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {children}
      </label>
      <InfoPopover title={infoTitle} label={infoTitle}>
        {info}
      </InfoPopover>
    </div>
  );
}

export function NotificationsForm({ initial }: { initial: SettingsView }) {
  const search = useSearchParams();
  const router = useRouter();
  const verifiedJustNow = search.get("email") === "verified";
  const invalidLink = search.get("email") === "invalid";
  const [email, setEmail] = useState(initial.pendingEmail || initial.notificationEmail || "");
  const [enabled, setEnabled] = useState(initial.enabled);
  const [prefs, setPrefs] = useState(initial.preferences);
  const [frequency, setFrequency] = useState<NotificationFrequency>(initial.frequency ?? "daily");
  const [time, setTime] = useState(initial.time ?? "16:00");
  const [timezone, setTimezone] = useState(initial.timezone ?? "Asia/Karachi");
  const [weekday, setWeekday] = useState(initial.weekday ?? 1);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    verifiedJustNow ? "✓ Email verified" : invalidLink ? "That verification link is invalid or has expired." : null,
  );
  const [error, setError] = useState<string | null>(null);

  const verified = initial.verified && !initial.pendingEmail;
  const showSchedule = frequency === "daily" || frequency === "weekly";
  const timezoneOptions = useMemo(() => {
    if (NOTIFICATION_TIMEZONES.includes(timezone as (typeof NOTIFICATION_TIMEZONES)[number])) {
      return [...NOTIFICATION_TIMEZONES];
    }
    return [timezone, ...NOTIFICATION_TIMEZONES];
  }, [timezone]);

  async function post(action: string, extra: Record<string, unknown> = {}) {
    setPending(action);
    setError(null);
    setMessage(null);
    const response = await fetch("/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await response.json();
    setPending(null);
    if (!response.ok) {
      const detail = typeof data.error === "string" ? data.error : "Unable to update notifications.";
      setError(detail);
      return { ok: false as const, error: detail };
    }
    router.refresh();
    return { ok: true as const, data };
  }

  async function saveEmail() {
    const result = await post("set-email", { email });
    if (result.ok) {
      setMessage(
        result.data.alreadyVerified
          ? "✓ Email verified"
          : "Verification email sent. Check that inbox and verify before notifications start.",
      );
    }
  }

  async function savePrefs() {
    const result = await post("save", {
      enabled,
      preferences: prefs,
      frequency,
      time,
      timezone,
      weekday,
    });
    if (result.ok) setMessage("Notification preferences saved.");
  }

  async function sendTest() {
    const result = await post("test");
    if (result.ok) setMessage("✓ Test email sent successfully");
    else setError(`⚠ Unable to send test email. ${result.error}`);
  }

  const recent = useMemo(() => initial.recent, [initial.recent]);

  return (
    <Card>
      <CardHeader
        title="Notifications"
        description="Email alerts for TestLoop activity."
        action={
          <InfoModal title="About notifications" label="About notifications">
            TestLoop sends notifications to your verified email address according to your selected
            notification preferences and schedule.
          </InfoModal>
        }
      />

      {!initial.smtpConfigured ? (
        <p className="mt-4 rounded-control border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
          Email sending is not configured on this server. SMTP stays on the server and is never shown here.
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-control border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel
            htmlFor="notification-email"
            infoTitle="Notification email"
            info="Mail is sent only to this verified address. It does not have to be your Google Play email."
          >
            Notification email
          </FieldLabel>
          <Input
            id="notification-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="developer@example.com"
          />
          <p className="mt-2 text-sm text-slate-700">
            {verified ? (
              <span className="font-medium text-emerald-700">✓ Email verified</span>
            ) : initial.pendingEmail ? (
              <span>Verification pending for {initial.pendingEmail}</span>
            ) : (
              <span className="text-muted">Not verified</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void saveEmail()} disabled={pending !== null}>
              {initial.notificationEmail ? "Change email" : "Add email"}
            </Button>
            {initial.pendingEmail ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void post("resend").then((result) => {
                    if (result.ok) setMessage("Verification email sent.");
                  })
                }
                disabled={pending !== null}
              >
                Resend
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid content-start gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-0.5">
              <span className="text-sm font-medium text-slate-900">Email notifications</span>
              <InfoPopover title="Email notifications" label="Email notifications">
                Turn this off to pause non-critical alerts. Verification and test emails still send.
                Frequency Disabled also stops scheduled and real-time mail.
              </InfoPopover>
            </div>
            <button
              type="button"
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}
              onClick={() => setEnabled((value) => !value)}
            >
              {enabled ? "ON" : "OFF"}
            </button>
          </div>

          <div>
            <FieldLabel
              htmlFor="notification-frequency"
              infoTitle="Frequency"
              info="Real-time sends each alert immediately. Daily and Weekly send one summary at your preferred time. Disabled stops email alerts."
            >
              Frequency
            </FieldLabel>
            <Select
              id="notification-frequency"
              value={frequency}
              onChange={(event) => setFrequency(event.target.value as NotificationFrequency)}
            >
              <option value="realtime">Real-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="disabled">Disabled</option>
            </Select>
          </div>

          {showSchedule ? (
            <div>
              <FieldLabel
                htmlFor="notification-time"
                infoTitle="Preferred time"
                info="The daily job sends a summary if this local time has been reached. The default is 4:00 PM in Asia/Karachi."
              >
                Preferred time
              </FieldLabel>
              <Input
                id="notification-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value || "16:00")}
              />
            </div>
          ) : null}

          {showSchedule ? (
            <div>
              <FieldLabel
                htmlFor="notification-timezone"
                infoTitle="Timezone"
                info="Times are interpreted in this timezone. Default is Asia/Karachi (Pakistan)."
              >
                Timezone
              </FieldLabel>
              <Select
                id="notification-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                {timezoneOptions.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {frequency === "weekly" ? (
            <div>
              <FieldLabel
                htmlFor="notification-weekday"
                infoTitle="Day of week"
                info="Weekly summaries are sent only on this day, at your preferred time."
              >
                Day of week
              </FieldLabel>
              <Select
                id="notification-weekday"
                value={String(weekday)}
                onChange={(event) => setWeekday(Number.parseInt(event.target.value, 10))}
              >
                {WEEKDAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Testing activity</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Checkbox
              className="py-2"
              checked={prefs.testerJoined}
              onChange={(event) => setPrefs((current) => ({ ...current, testerJoined: event.target.checked }))}
              label="New tester requests"
            />
            <Checkbox
              className="py-2"
              checked={prefs.testerAccepted}
              onChange={(event) => setPrefs((current) => ({ ...current, testerAccepted: event.target.checked }))}
              label="Testing activity"
            />
            <Checkbox
              className="py-2"
              checked={prefs.testerActionRequired}
              onChange={(event) => setPrefs((current) => ({ ...current, testerActionRequired: event.target.checked }))}
              label="Tester requires action"
            />
            <Checkbox
              className="py-2"
              checked={prefs.testerConfirmed}
              onChange={(event) => setPrefs((current) => ({ ...current, testerConfirmed: event.target.checked }))}
              label="Tester confirmation"
            />
            <Checkbox
              className="py-2"
              checked={prefs.testerOnboardingIssue}
              onChange={(event) => setPrefs((current) => ({ ...current, testerOnboardingIssue: event.target.checked }))}
              label="Tester onboarding issue"
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Google Play</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Checkbox
              className="py-2"
              checked={prefs.playSyncIssues}
              onChange={(event) => setPrefs((current) => ({ ...current, playSyncIssues: event.target.checked }))}
              label="Synchronization issues"
            />
            <Checkbox
              className="py-2"
              checked={prefs.playTrackChanges}
              onChange={(event) => setPrefs((current) => ({ ...current, playTrackChanges: event.target.checked }))}
              label="Track status changes"
            />
            <Checkbox
              className="py-2"
              checked={prefs.playActionRequired}
              onChange={(event) => setPrefs((current) => ({ ...current, playActionRequired: event.target.checked }))}
              label="Google Play action required"
            />
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Testing requests</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Checkbox
              className="py-2"
              checked={prefs.requestActivity}
              onChange={(event) => setPrefs((current) => ({ ...current, requestActivity: event.target.checked }))}
              label="New request activity"
            />
            <Checkbox
              className="py-2"
              checked={prefs.requestArchived}
              onChange={(event) => setPrefs((current) => ({ ...current, requestArchived: event.target.checked }))}
              label="Request archived"
            />
            <Checkbox
              className="py-2"
              checked={prefs.requestCompleted}
              onChange={(event) => setPrefs((current) => ({ ...current, requestCompleted: event.target.checked }))}
              label="Request completed"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Summary</p>
            <InfoPopover title="Scheduled summary" label="Scheduled summary">
              Included when frequency is Daily or Weekly. Real-time alerts still follow the switches above.
            </InfoPopover>
          </div>
          <div className="mt-2">
            <Checkbox
              className="py-2"
              checked={prefs.dailySummary}
              onChange={(event) => setPrefs((current) => ({ ...current, dailySummary: event.target.checked }))}
              label="Include a testing summary"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setPrefs({
              testerJoined: true,
              testerAccepted: true,
              testerActionRequired: true,
              testerConfirmed: true,
              testerOnboardingIssue: true,
              playSyncIssues: true,
              playTrackChanges: true,
              playActionRequired: true,
              requestActivity: true,
              requestArchived: true,
              requestCompleted: true,
              dailySummary: true,
            })
          }
        >
          Enable all
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setPrefs({
              testerJoined: false,
              testerAccepted: false,
              testerActionRequired: false,
              testerConfirmed: false,
              testerOnboardingIssue: false,
              playSyncIssues: false,
              playTrackChanges: false,
              playActionRequired: false,
              requestActivity: false,
              requestArchived: false,
              requestCompleted: false,
              dailySummary: false,
            })
          }
        >
          Disable all
        </Button>
        <Button type="button" onClick={() => void savePrefs()} disabled={pending !== null}>
          Save preferences
        </Button>
        <Button type="button" variant="secondary" onClick={() => void sendTest()} disabled={pending !== null || !verified}>
          Send test email
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted">
        Last successful notification: {formatWhen(initial.lastNotificationSentAt)}
        {initial.lastDailySummaryStatus ? ` · Last summary: ${initial.lastDailySummaryStatus}` : ""}
      </p>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Recent email activity</p>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No email has been sent yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  {statusMark(row.status)} {typeLabel(row.type)}
                  <span className="text-muted"> — {row.status}</span>
                </span>
                <span className="text-xs text-muted">{formatWhen(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
