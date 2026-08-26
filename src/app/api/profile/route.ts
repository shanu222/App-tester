import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import { completeProfile, sanitizeUser } from "@/lib/services/users";
import { developerBadges } from "@/lib/services/network";

const schema = z.object({
  name: z.string().min(2).max(120),
  developerName: z.string().min(2).max(120),
  company: z.string().max(120).optional(),
  country: z.string().min(2).max(80),
  city: z.string().max(80).optional(),
  developerType: z.string().min(2).max(80),
  yearsExperience: z.number().int().min(0).max(60).optional(),
  platforms: z.array(z.enum(["Android", "iOS", "Web", "Other"])).min(1),
  technologies: z.string().max(400).optional(),
  website: z.string().max(200).optional(),
  github: z.string().max(200).optional(),
  linkedin: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  testingGmail: z.string().max(200).optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const badges = await developerBadges(user.id);
    return json({ user: sanitizeUser(user), ...badges });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, schema);
    const updated = await completeProfile(user.id, body);
    return json({ user: sanitizeUser(updated) });
  } catch (error) {
    return handleRouteError(error);
  }
}
