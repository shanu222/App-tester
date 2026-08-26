import { requireUser } from "@/auth";
import { CompleteProfileForm } from "@/components/profile/complete-profile-form";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function CompleteProfilePage() {
  const user = await requireUser();
  const play = await prisma.integration.findFirst({
    where: { userId: user.id, provider: "GOOGLE_PLAY", status: "CONNECTED" },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-teal-300">TesterBridge</p>
          <h1 className="mt-1 text-2xl font-semibold">Complete your developer profile</h1>
          <p className="mt-2 text-sm text-slate-400">
            Every member is a developer. Campaigns stay locked until this profile is complete.
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
      <CompleteProfileForm
        defaults={{
          name: user.name || "",
          developerName: user.developerName || user.name || "",
          company: user.company || "",
          country: user.country || "",
          city: user.city || "",
          developerType: user.developerType || "ANDROID_DEVELOPER",
          yearsExperience: user.yearsExperience?.toString() || "",
          platforms: user.platforms,
          technologies: user.technologies || "",
          website: user.website || "",
          github: user.github || "",
          linkedin: user.linkedin || "",
          bio: user.bio || "",
          testingGmail: user.testingGmail || user.email,
          image: user.image,
          playConnected: Boolean(play),
          completed: user.profileCompleted,
        }}
      />
    </main>
  );
}
