"use client";

import { FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/fields";
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
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="font-medium">Profile</h2>
        <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input name="name" defaultValue={user.name} />
          </div>
          <div>
            <Label>Email</Label>
            <Input defaultValue={user.email} disabled />
          </div>
          <div>
            <Label>Developer / company</Label>
            <Input name="developerName" defaultValue={user.developerName} />
          </div>
          <div>
            <Label>Company</Label>
            <Input name="company" defaultValue={user.company} />
          </div>
          <div>
            <Label>Comments / hour</Label>
            <Input name="commentsPerHour" type="number" defaultValue={settings.commentsPerHour} />
          </div>
          <div>
            <Label>Comments / day</Label>
            <Input name="commentsPerDay" type="number" defaultValue={settings.commentsPerDay} />
          </div>
          <div>
            <Label>Processed posts / day</Label>
            <Input name="processedPostsPerDay" type="number" defaultValue={settings.processedPostsPerDay} />
          </div>
          <div>
            <Label>Messages / day</Label>
            <Input name="messagesPerDay" type="number" defaultValue={settings.messagesPerDay} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requireCommentApproval" defaultChecked={settings.requireCommentApproval} />
            Require comment approval
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowAutomatedEmail" defaultChecked={settings.allowAutomatedEmail} />
            Allow automated Gmail sending
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifyOpportunities" defaultChecked={settings.notifyOpportunities} />
            Notify new opportunities
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifyReplies" defaultChecked={settings.notifyReplies} />
            Notify replies
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifyTesters" defaultChecked={settings.notifyTesters} />
            Notify tester events
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifyIntegrations" defaultChecked={settings.notifyIntegrations} />
            Notify integration errors
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notifyFeedback" defaultChecked={settings.notifyFeedback} />
            Notify feedback
          </label>
          <div>
            <Label>Closed-test target (configurable)</Label>
            <Input name="playClosedTestTarget" type="number" defaultValue={settings.playClosedTestTarget} />
          </div>
          <div>
            <Label>Closed-test days (configurable)</Label>
            <Input name="playClosedTestDays" type="number" defaultValue={settings.playClosedTestDays} />
          </div>
          <div className="md:col-span-2">
            <Label>Default keywords</Label>
            <Textarea name="defaultKeywords" defaultValue={settings.defaultKeywords} />
          </div>
          <div>
            <Button type="submit">Save settings</Button>
          </div>
        </form>
      </Card>
      <Card className="p-5">
        <h2 className="font-medium">Templates</h2>
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          {templates.map((template) => (
            <div key={template.key}>
              <div className="font-medium">{template.name}</div>
              <pre className="mt-1 whitespace-pre-wrap text-slate-400">{template.body}</pre>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-medium">Privacy & data</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <JsonButton url="/api/export" label="Export tester data" />
        </div>
      </Card>
    </div>
  );
}
