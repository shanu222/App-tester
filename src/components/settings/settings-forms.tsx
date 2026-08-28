"use client";

import { FormEvent } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Hint, Input, Label, Textarea } from "@/components/ui/fields";
import { JsonButton } from "@/components/ui/json-button";

export function SettingsForms({
  user,
  settings,
  templates,
}: {
  user: { name: string; email: string; developerName: string; company: string };
  settings: {
    commentsPerHour: number;
    commentsPerDay: number;
    processedPostsPerDay: number;
    messagesPerDay: number;
    requireCommentApproval: boolean;
    allowAutomatedEmail: boolean;
    notifyOpportunities: boolean;
    notifyReplies: boolean;
    notifyTesters: boolean;
    notifyIntegrations: boolean;
    notifyFeedback: boolean;
    playClosedTestTarget: number;
    playClosedTestDays: number;
    defaultKeywords: string;
  };
  templates: Array<{ key: string; name: string; body: string }>;
}) {
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        developerName: form.get("developerName"),
        company: form.get("company"),
        commentsPerHour: Number(form.get("commentsPerHour")),
        commentsPerDay: Number(form.get("commentsPerDay")),
        processedPostsPerDay: Number(form.get("processedPostsPerDay")),
        messagesPerDay: Number(form.get("messagesPerDay")),
        requireCommentApproval: form.get("requireCommentApproval") === "on",
        allowAutomatedEmail: form.get("allowAutomatedEmail") === "on",
        notifyOpportunities: form.get("notifyOpportunities") === "on",
        notifyReplies: form.get("notifyReplies") === "on",
        notifyTesters: form.get("notifyTesters") === "on",
        notifyIntegrations: form.get("notifyIntegrations") === "on",
        notifyFeedback: form.get("notifyFeedback") === "on",
        playClosedTestTarget: Number(form.get("playClosedTestTarget")),
        playClosedTestDays: Number(form.get("playClosedTestDays")),
        defaultKeywords: String(form.get("defaultKeywords") || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      }),
    });
    window.location.reload();
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader title="Profile" description="How other developers see you across TestLoop." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="settings-name">Name</Label>
            <Input id="settings-name" name="name" defaultValue={user.name} />
          </div>
          <div>
            <Label htmlFor="settings-email">Email</Label>
            <Input id="settings-email" defaultValue={user.email} disabled />
            <Hint>Your sign-in email cannot be changed here.</Hint>
          </div>
          <div>
            <Label htmlFor="settings-developer">Developer / company</Label>
            <Input id="settings-developer" name="developerName" defaultValue={user.developerName} />
          </div>
          <div>
            <Label htmlFor="settings-company">Company</Label>
            <Input id="settings-company" name="company" defaultValue={user.company} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Rate limits"
          description="Caps that keep outreach within safe, human-paced volumes."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="commentsPerHour">Comments / hour</Label>
            <Input id="commentsPerHour" name="commentsPerHour" type="number" min={0} defaultValue={settings.commentsPerHour} />
          </div>
          <div>
            <Label htmlFor="commentsPerDay">Comments / day</Label>
            <Input id="commentsPerDay" name="commentsPerDay" type="number" min={0} defaultValue={settings.commentsPerDay} />
          </div>
          <div>
            <Label htmlFor="processedPostsPerDay">Processed posts / day</Label>
            <Input id="processedPostsPerDay" name="processedPostsPerDay" type="number" min={0} defaultValue={settings.processedPostsPerDay} />
          </div>
          <div>
            <Label htmlFor="messagesPerDay">Messages / day</Label>
            <Input id="messagesPerDay" name="messagesPerDay" type="number" min={0} defaultValue={settings.messagesPerDay} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Automation & in-app alerts" description="These alerts appear inside TestLoop. Email alerts are configured above." />
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Checkbox
            name="requireCommentApproval"
            defaultChecked={settings.requireCommentApproval}
            label="Require comment approval"
          />
          <Checkbox
            name="allowAutomatedEmail"
            defaultChecked={settings.allowAutomatedEmail}
            label="Allow automated Gmail sending"
          />
          <Checkbox
            name="notifyOpportunities"
            defaultChecked={settings.notifyOpportunities}
            label="Notify new opportunities"
          />
          <Checkbox name="notifyReplies" defaultChecked={settings.notifyReplies} label="Notify replies" />
          <Checkbox name="notifyTesters" defaultChecked={settings.notifyTesters} label="In-app: tester events" />
          <Checkbox
            name="notifyIntegrations"
            defaultChecked={settings.notifyIntegrations}
            label="Notify integration errors"
          />
          <Checkbox name="notifyFeedback" defaultChecked={settings.notifyFeedback} label="Notify feedback" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Closed-testing defaults" description="Applied when you create a new testing request." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="playClosedTestTarget">Closed-test tester target</Label>
            <Input id="playClosedTestTarget" name="playClosedTestTarget" type="number" min={1} defaultValue={settings.playClosedTestTarget} />
          </div>
          <div>
            <Label htmlFor="playClosedTestDays">Closed-test duration (days)</Label>
            <Input id="playClosedTestDays" name="playClosedTestDays" type="number" min={1} defaultValue={settings.playClosedTestDays} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="defaultKeywords">Default keywords</Label>
            <Textarea id="defaultKeywords" name="defaultKeywords" defaultValue={settings.defaultKeywords} />
            <Hint>One keyword per line.</Hint>
          </div>
        </div>
      </Card>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" className="shadow-overlay">
          Save settings
        </Button>
      </div>

      <Card>
        <CardHeader title="Templates" description="Message templates available to your campaigns." />
        {templates.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No templates yet.</p>
        ) : (
          <div className="mt-5 space-y-4">
            {templates.map((template) => (
              <div key={template.key} className="rounded-control border border-line bg-surface p-4">
                <div className="text-sm font-medium text-slate-900">{template.name}</div>
                <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-6 text-muted">
                  {template.body}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Privacy & data"
          description="Export the tester records associated with your account."
          action={<JsonButton url="/api/export" label="Export tester data" variant="secondary" />}
        />
      </Card>
    </form>
  );
}
