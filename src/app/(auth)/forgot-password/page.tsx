import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to reset your NITS HelpDesk password.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-8 flex w-full flex-col items-center text-center">
        <h1 className="text-headline-lg text-on-surface mb-2">Reset your password</h1>
        <p className="text-body-md text-on-surface-variant max-w-[320px]">
          Enter your institute email and we&apos;ll send you a link to set a new
          password.
        </p>
      </div>

      <ForgotPasswordForm />

      <Link
        href="/login"
        className="text-body-md text-primary mt-8 text-center hover:underline underline-offset-4"
      >
        Back to sign in
      </Link>
    </>
  );
}
