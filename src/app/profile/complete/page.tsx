import { requireUser } from "@/auth";
import { CompleteProfileForm } from "@/components/profile/complete-profile-form";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SiteFooter } from "@/components/layout/public-chrome";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default async function CompleteProfilePage() {
  const user = await requireUser();
  const play = await prisma.integration.findFirst({
    where: { userId: user.id, provider: "GOOGLE_PLAY", status: "CONNECTED" },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <BrandLogo href="/" size="md" />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold">Complete your developer profile</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Every member is a developer. Campaigns stay locked until this profile is complete.
        </p>
        <div className="mt-8">
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
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
