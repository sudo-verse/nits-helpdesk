import type { Metadata } from "next";
import Image from "next/image";

import { GoogleButton } from "@/components/auth/google-button";
import { PasswordAuthForm } from "@/components/auth/password-auth-form";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to NITS HelpDesk with your NIT Silchar institute account.",
};

/** Error codes handed back by /auth/callback and the middleware. */
const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed:
    "That account is not a NIT Silchar account. Sign in with your @nits.ac.in or @students.nits.ac.in address.",
  account_disabled:
    "This account has been deactivated. Contact the helpdesk administrator.",
  profile_missing: "Your profile could not be loaded. Try signing in again.",
  access_denied: "Sign-in was cancelled.",
  missing_code: "That sign-in link is incomplete. Request a new code.",
  signin_failed: "Something went wrong signing you in. Try again.",
  forbidden: "You do not have access to that page.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.signin_failed) : null;

  return (
    <>
      <div className="mb-12 flex w-full flex-col items-center">
        <Image
          src="/logo.png"
          alt=""
          width={96}
          height={96}
          priority
          className="mb-6 size-24 rounded-xl object-contain"
        />
        <h1 className="text-display-lg text-on-surface mb-2 text-center">
          Welcome Back
        </h1>
        <p className="text-body-md text-on-surface-variant max-w-[280px] text-center">
          Sign in to track your support requests and manage academic resources.
        </p>
      </div>

      {message && (
        <div
          role="alert"
          className="bg-error-container/20 border-error/30 text-on-error-container dark:text-error mb-4 flex w-full items-start gap-2 rounded-lg border p-3"
        >
          <Icon name="error" size={20} className="mt-0.5 shrink-0" />
          <p className="text-body-md">{message}</p>
        </div>
      )}

      <div className="flex w-full flex-col gap-4">
        <div className="bg-surface-container-low text-on-surface-variant mb-2 rounded-lg p-4 text-center text-sm">
          Please use your institute email address (@nits.ac.in or @students.nits.ac.in) to sign in.
        </div>
        <GoogleButton />

        <div className="flex items-center gap-3" role="separator" aria-label="or">
          <div className="border-outline-variant h-px flex-1 border-t" />
          <span className="text-label-sm text-on-surface-variant font-mono uppercase">or</span>
          <div className="border-outline-variant h-px flex-1 border-t" />
        </div>

        <PasswordAuthForm />
      </div>

      <p className="text-label-sm text-on-surface-variant mt-12 text-center font-mono">
        Helping make NIT Silchar better, together.
      </p>
    </>
  );
}
