"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";

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
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      {defaults.image ? (
        <div className="md:col-span-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={defaults.image} alt="" className="h-14 w-14 rounded-full object-cover" />
          <p className="text-sm text-slate-400">Profile photo from Google. TestLoop does not store Google passwords.</p>
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
        <div className="flex flex-wrap gap-3 text-sm">
          {PLATFORMS.map((item) => (
            <label key={item} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={platforms.includes(item)}
                onChange={(event) => {
                  setPlatforms((current) =>
                    event.target.checked ? [...current, item] : current.filter((value) => value !== item),
                  );
                }}
              />
              {item}
            </label>
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
      <div className="md:col-span-2 rounded-xl border border-slate-800 p-4 text-sm text-slate-300">
        Google Play developer account: {defaults.playConnected ? "Connected" : "Not connected"}
      </div>
      <div className="md:col-span-2">
        <Label>Developer bio</Label>
        <Textarea name="bio" defaultValue={defaults.bio} />
      </div>
      {error ? <p className="md:col-span-2 text-sm text-rose-300">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : defaults.completed ? "Save profile" : "Complete profile"}
        </Button>
      </div>
    </form>
  );
}
