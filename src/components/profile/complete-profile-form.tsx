"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/fields";

const TYPES = [
  { id: "ANDROID_DEVELOPER", label: "Android developer" },
  { id: "INDIE", label: "Indie developer" },
  { id: "STARTUP_FOUNDER", label: "Startup founder" },
  { id: "SOFTWARE_DEVELOPER", label: "Software developer" },
  { id: "TEAM", label: "Development team" },
];

const PLATFORMS = ["Android", "iOS", "Web", "Other"] as const;

export function CompleteProfileForm({
  defaults,
}: {
  defaults: {
    name: string;
    developerName: string;
    company: string;
    country: string;
    city: string;
    developerType: string;
    yearsExperience: string;
    platforms: string[];
    technologies: string;
    website: string;
    github: string;
    linkedin: string;
    bio: string;
    testingGmail: string;
    image: string | null;
    playConnected: boolean;
    completed: boolean;
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(
    defaults.platforms.length ? defaults.platforms : ["Android"],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          developerName: form.get("developerName"),
          company: form.get("company") || undefined,
          country: form.get("country"),
          city: form.get("city") || undefined,
          developerType: form.get("developerType"),
          yearsExperience: form.get("yearsExperience") ? Number(form.get("yearsExperience")) : undefined,
          platforms,
          technologies: form.get("technologies") || undefined,
          website: form.get("website") || undefined,
          github: form.get("github") || undefined,
          linkedin: form.get("linkedin") || undefined,
          bio: form.get("bio") || undefined,
          testingGmail: form.get("testingGmail") || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not save profile");
      }
      window.location.href = defaults.completed ? "/profile" : "/onboarding";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4 rounded-card border border-line bg-white p-5 shadow-card md:grid-cols-2 sm:p-6"
    >
      {defaults.image ? (
        <div className="flex items-center gap-3 md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={defaults.image}
            alt=""
            className="h-12 w-12 rounded-full border border-line object-cover"
          />
          <p className="text-sm leading-6 text-muted">
            Profile photo from Google. TestLoop does not store Google passwords.
          </p>
        </div>
      ) : null}
      <div>
        <Label>Full name</Label>
        <Input name="name" defaultValue={defaults.name} required />
      </div>
      <div>
        <Label>Developer name / company</Label>
        <Input name="developerName" defaultValue={defaults.developerName} required />
      </div>
      <div>
        <Label>Company (optional)</Label>
        <Input name="company" defaultValue={defaults.company} />
      </div>
      <div>
        <Label>Country</Label>
        <Input name="country" defaultValue={defaults.country} required />
      </div>
      <div>
        <Label>City</Label>
        <Input name="city" defaultValue={defaults.city} />
      </div>
      <div>
        <Label>Developer type</Label>
        <Select name="developerType" defaultValue={defaults.developerType || "ANDROID_DEVELOPER"} required>
          {TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Years of development experience</Label>
        <Input name="yearsExperience" type="number" min={0} max={60} defaultValue={defaults.yearsExperience} />
      </div>
      <div className="md:col-span-2">
        <Label>Primary platforms</Label>
        <div className="grid gap-2.5 sm:grid-cols-4">
          {PLATFORMS.map((item) => (
            <Checkbox
              key={item}
              label={item}
              checked={platforms.includes(item)}
              onChange={(event) => {
                setPlatforms((current) =>
                  event.target.checked ? [...current, item] : current.filter((value) => value !== item),
                );
              }}
            />
          ))}
        </div>
      </div>
      <div className="md:col-span-2">
        <Label>Programming technologies</Label>
        <Input name="technologies" defaultValue={defaults.technologies} placeholder="Kotlin, Jetpack Compose, Firebase…" />
      </div>
      <div>
        <Label>Website</Label>
        <Input name="website" defaultValue={defaults.website} />
      </div>
      <div>
        <Label>GitHub</Label>
        <Input name="github" defaultValue={defaults.github} />
      </div>
      <div>
        <Label>LinkedIn</Label>
        <Input name="linkedin" defaultValue={defaults.linkedin} />
      </div>
      <div>
        <Label>Google Play testing Gmail</Label>
        <Input name="testingGmail" type="email" defaultValue={defaults.testingGmail} placeholder="Used only after you accept a test" />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface p-4 text-sm md:col-span-2">
        <span className="text-slate-700">Google Play developer account</span>
        <Badge tone={defaults.playConnected ? "good" : "neutral"}>
          {defaults.playConnected ? "Connected" : "Not connected"}
        </Badge>
      </div>
      <div className="md:col-span-2">
        <Label>Developer bio</Label>
        <Textarea name="bio" defaultValue={defaults.bio} />
      </div>
      {error ? (
        <p
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 md:col-span-2"
        >
          {error}
        </p>
      ) : null}
      <div className="md:col-span-2 border-t border-line pt-5">
        <Button type="submit" aria-busy={pending} disabled={pending}>
          {pending ? "Saving…" : defaults.completed ? "Save profile" : "Complete profile"}
        </Button>
      </div>
    </form>
  );
}
