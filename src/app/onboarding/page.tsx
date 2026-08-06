import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireUser } from "@/lib/auth/session";
import { isSafeNextPath } from "@/lib/navigation";
import { getAcademicDepartments, getHostels } from "@/lib/repositories/reference";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // requireOnboarded:false — this IS the onboarding page; gating on it would
  // redirect the page to itself.
  const user = await requireUser({ requireOnboarded: false });
  const { next: rawNext } = await searchParams;
  const next = isSafeNextPath(rawNext) ? rawNext : undefined;

  if (user.profile.onboarded_at) {
    redirect(`/auth/post-login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  const [departments, hostels] = await Promise.all([
    getAcademicDepartments(),
    getHostels(),
  ]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-headline-lg text-on-surface mb-2">
          Welcome to NITS HelpDesk
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Tell us a little about yourself. This helps route your complaints to
          the right department — you can change any of it later from your profile.
        </p>
      </div>

      <OnboardingForm
        defaultName={user.profile.name ?? ""}
        email={user.email}
        departments={departments ?? []}
        hostels={hostels ?? []}
        next={next}
      />
    </div>
  );
}
