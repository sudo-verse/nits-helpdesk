import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage() {
  // Deliberately not in middleware's PUBLIC_PATHS — reaching this page at all
  // requires the recovery session /auth/callback just established from the
  // emailed link. requireOnboarded:false because an account going through
  // recovery is presumably already onboarded and shouldn't be detoured.
  await requireUser({ requireOnboarded: false });

  return (
    <>
      <div className="mb-8 flex w-full flex-col items-center text-center">
        <h1 className="text-headline-lg text-on-surface mb-2">Set a new password</h1>
        <p className="text-body-md text-on-surface-variant max-w-[320px]">
          Choose a new password for your account.
        </p>
      </div>

      <ResetPasswordForm />
    </>
  );
}
